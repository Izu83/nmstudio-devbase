"""Sunny Complex site server: the static site plus a small reservations API.

    python server.py [port] [--open]   (default 5173; --open also opens the site in the browser;
                                        set SUNNY_HOST=0.0.0.0 to reach it from phones on the same Wi-Fi)

On Windows, start.bat does this with a double-click.

Reservations and home-delivery orders are kept in data/reservations.db (SQLite), the couriers'
names in data/couriers.json. The staff password for /admin comes from
the SUNNY_ADMIN_PASSWORD environment variable, or from data/admin-password.txt, which is created
with a random password on first run. Nothing under data/ is ever served to the browser.
Only the Python standard library is used.
"""
import datetime as dt
import hmac
import json
import os
import re
import secrets
import sqlite3
import sys
import threading
import time
import webbrowser
from http import HTTPStatus
from http.cookies import SimpleCookie
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, unquote, urlparse

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(ROOT, "data")
DB_PATH = os.path.join(DATA, "reservations.db")
PASSWORD_FILE = os.path.join(DATA, "admin-password.txt")

with open(os.path.join(ROOT, "assets", "tables.js"), encoding="utf-8") as f:
    _src = f.read()
FLOOR = json.loads(_src[_src.index("{", _src.index("FLOOR_DATA")):_src.rindex("}") + 1])
TABLES = {t["id"]: t for t in FLOOR["tables"]}
OPEN, LAST, DURATION = FLOOR["open"], FLOOR["last"], FLOOR["duration"]  # a booking holds its table for DURATION hours
BIGGEST = max(t["seats"] for t in TABLES.values())
MAX_GUESTS, AHEAD_DAYS = 30, 90
ACTIVE = ("pending", "confirmed", "seated")
STATUSES = ACTIVE + ("cancelled", "noshow")
SESSION_SECONDS = 12 * 3600
COOKIE = "sunny_admin"

os.makedirs(DATA, exist_ok=True)


def read_password():
    env = os.environ.get("SUNNY_ADMIN_PASSWORD")
    if env:
        return env
    if not os.path.exists(PASSWORD_FILE):
        with open(PASSWORD_FILE, "w", encoding="utf-8") as f:
            f.write(secrets.token_urlsafe(9) + "\n")
        print(f"Created a staff password in {PASSWORD_FILE}")
    with open(PASSWORD_FILE, encoding="utf-8") as f:
        return f.read().strip()


PASSWORD = read_password()


def connect():
    con = sqlite3.connect(DB_PATH, timeout=10)
    con.row_factory = sqlite3.Row
    return con


with connect() as con:
    con.execute("""CREATE TABLE IF NOT EXISTS reservations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        day TEXT NOT NULL, hour INTEGER NOT NULL, table_id INTEGER, guests INTEGER NOT NULL,
        name TEXT NOT NULL, phone TEXT NOT NULL, note TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'pending', source TEXT NOT NULL DEFAULT 'web',
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL)""")
    con.execute("CREATE INDEX IF NOT EXISTS by_day ON reservations(day)")
    con.execute("""CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT, day TEXT NOT NULL,
        name TEXT NOT NULL, phone TEXT NOT NULL, town TEXT NOT NULL, address TEXT NOT NULL,
        details TEXT NOT NULL DEFAULT '', note TEXT NOT NULL DEFAULT '',
        payment TEXT NOT NULL, deliver_at TEXT NOT NULL DEFAULT 'asap',
        items TEXT NOT NULL, subtotal INTEGER NOT NULL, fee INTEGER NOT NULL, total INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'new', courier INTEGER,
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
        accepted_at TEXT, sent_at TEXT, delivered_at TEXT)""")
    con.execute("CREATE INDEX IF NOT EXISTS orders_by_day ON orders(day)")
    # code: the secret in the guest's own link to a booking. guest_cancelled: the guest cancelled it from that link.
    _cols = {r["name"] for r in con.execute("PRAGMA table_info(reservations)")}
    if "code" not in _cols:
        con.execute("ALTER TABLE reservations ADD COLUMN code TEXT")
    if "guest_cancelled" not in _cols:
        con.execute("ALTER TABLE reservations ADD COLUMN guest_cancelled INTEGER NOT NULL DEFAULT 0")
    # A closed day (tables NULL: the whole restaurant) or tables held back for a day, e.g. for a private party
    con.execute("""CREATE TABLE IF NOT EXISTS closures (
        id INTEGER PRIMARY KEY AUTOINCREMENT, day TEXT NOT NULL, tables TEXT,
        reason TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL)""")
con.close()

write_lock = threading.Lock()  # one booking at a time, so two guests can't take the same table
sessions = {}                  # token -> expiry time
hits = {}                      # (kind, ip) -> recent timestamps, for simple rate limits


class Bad(Exception):
    def __init__(self, message, status=HTTPStatus.BAD_REQUEST):
        super().__init__(message)
        self.status = status


def limited(kind, ip, most, seconds):
    now = time.time()
    recent = [t for t in hits.get((kind, ip), []) if now - t < seconds]
    hits[(kind, ip)] = recent
    return len(recent) >= most


def note_hit(kind, ip):
    hits.setdefault((kind, ip), []).append(time.time())


def as_int(value, what):
    try:
        return int(value)
    except (TypeError, ValueError):
        raise Bad(f"Невалидна стойност: {what}.")


def check(r, staff, kept_hour=None):
    """Validates a reservation and returns it cleaned. Staff may book past hours and seat bigger groups.
    kept_hour: an existing booking's hour, accepted as is even if the hours have changed since."""
    today, now = dt.date.today(), dt.datetime.now()
    try:
        day = dt.date.fromisoformat(str(r.get("day")))
    except ValueError:
        raise Bad("Невалидна дата.")
    if not staff and not today <= day <= today + dt.timedelta(days=AHEAD_DAYS):
        raise Bad(f"Можете да резервирате до {AHEAD_DAYS} дни напред.")
    hour = as_int(r.get("hour"), "час")
    if not OPEN <= hour <= LAST and hour != kept_hour:
        raise Bad(f"Резервации се приемат от {OPEN}:00 до {LAST}:00.")
    if not staff and day == today and hour <= now.hour:
        raise Bad("Този час вече мина.")
    guests = as_int(r.get("guests"), "гости")
    if not 1 <= guests <= MAX_GUESTS:
        raise Bad("Невалиден брой гости.")
    table = r.get("table")
    if table in (None, "", 0):
        table = None
    else:
        table = as_int(table, "маса")
        if table not in TABLES:
            raise Bad("Няма такава маса.")
        if not staff and TABLES[table]["seats"] < guests:
            raise Bad(f"Маса {table} е за до {TABLES[table]['seats']} души.")
    if table is None and not staff and guests <= BIGGEST:
        raise Bad("Изберете маса.")
    name = str(r.get("name") or "").strip()[:80]
    phone = str(r.get("phone") or "").strip()[:30]
    note = str(r.get("note") or "").strip()[:500]
    if not name:
        raise Bad("Напишете име.")
    if not staff and len(re.sub(r"\D", "", phone)) < 9:
        raise Bad("Напишете телефон, на който да ви потърсим.")
    status = r.get("status") or "pending"
    if status not in STATUSES:
        raise Bad("Невалиден статус.")
    return {"day": day.isoformat(), "hour": hour, "table_id": table, "guests": guests,
            "name": name, "phone": phone, "note": note, "status": status}


def clash(con, rec, exclude=None):
    if rec["table_id"] is None or rec["status"] not in ACTIVE:
        return None
    return con.execute(
        "SELECT id, hour, name FROM reservations WHERE day = ? AND table_id = ? AND status IN (?, ?, ?)"
        " AND ABS(hour - ?) < ? AND id IS NOT ?",
        (rec["day"], rec["table_id"], *ACTIVE, rec["hour"], DURATION, exclude)).fetchone()


def row_json(row):
    d = dict(row)
    d["table"] = d.pop("table_id")
    d.pop("code", None)
    return d


def stamp():
    return dt.datetime.now().isoformat(timespec="seconds")


def closure_json(row):
    return {"id": row["id"], "day": row["day"], "tables": json.loads(row["tables"]) if row["tables"] else None,
            "reason": row["reason"], "created_at": row["created_at"]}


def closed(con, day):
    """(whole day closed, set of tables held back) for a day."""
    whole, held = False, set()
    for row in con.execute("SELECT tables FROM closures WHERE day = ?", (day,)):
        if row["tables"] is None:
            whole = True
        else:
            held.update(json.loads(row["tables"]))
    return whole, held


def insert(rec, source):
    with write_lock, connect() as con:
        if source == "web":
            whole, held = closed(con, rec["day"])
            if whole:
                raise Bad("На този ден ресторантът е зает с частно събитие. Обадете се за друг ден.", HTTPStatus.CONFLICT)
            if rec["table_id"] in held:
                raise Bad(f"Маса {rec['table_id']} не е свободна на този ден.", HTTPStatus.CONFLICT)
        hit = clash(con, rec)
        if hit:
            raise Bad(f"Маса {rec['table_id']} вече е заета около {hit['hour']}:00.", HTTPStatus.CONFLICT)
        cur = con.execute(
            "INSERT INTO reservations (day, hour, table_id, guests, name, phone, note, status, source, code, created_at, updated_at)"
            " VALUES (:day, :hour, :table_id, :guests, :name, :phone, :note, :status, :source, :code, :now, :now)",
            {**rec, "source": source, "code": secrets.token_urlsafe(9), "now": stamp()})
        row = con.execute("SELECT * FROM reservations WHERE id = ?", (cur.lastrowid,)).fetchone()
        return {**row_json(row), "code": row["code"]}


def guest_view(row):
    """What the guest's own link shows. They may cancel until the booked hour."""
    start = dt.datetime.fromisoformat(row["day"]).replace(hour=row["hour"])
    return {"id": row["id"], "day": row["day"], "hour": row["hour"], "table": row["table_id"], "guests": row["guests"],
            "name": row["name"], "status": row["status"], "guest_cancelled": bool(row["guest_cancelled"]),
            "can_cancel": row["status"] in ("pending", "confirmed") and start > dt.datetime.now()}


def find_own(con, rid, code):
    row = con.execute("SELECT * FROM reservations WHERE id = ?", (rid,)).fetchone()
    if not row or not row["code"] or not hmac.compare_digest(str(code).encode(), row["code"].encode()):
        raise Bad("Не намираме тази резервация. Проверете линка или се обадете.", HTTPStatus.NOT_FOUND)
    return row


KEEP_DAYS = 365   # names, phones and addresses are wiped from bookings and orders older than this (see /privacy/)
_forgotten = None


def forget_old():
    global _forgotten
    today = dt.date.today()
    if _forgotten == today:
        return
    _forgotten = today
    cutoff = (today - dt.timedelta(days=KEEP_DAYS)).isoformat()
    with write_lock, connect() as con:
        con.execute("UPDATE reservations SET name = '—', phone = '', note = '' WHERE day < ? AND phone != ''", (cutoff,))
        con.execute("UPDATE orders SET name = '—', phone = '', address = '—', details = '', note = ''"
                    " WHERE day < ? AND phone != ''", (cutoff,))


def agreed(data):
    if data.get("agree") is not True:
        raise Bad("Отбележете, че сте прочели политиката за поверителност.")
    return data


# ---------- Home delivery ----------
with open(os.path.join(ROOT, "menu", "menu-data.js"), encoding="utf-8") as f:
    _src = f.read()
MENU = json.loads(_src[_src.index("[", _src.index("window.MENU")):_src.rindex("]") + 1])


def cents(price):
    """'10,90' -> 1090"""
    euros, _, rest = price.partition(",")
    return int(euros) * 100 + int((rest + "00")[:2])


# What the menu page may order, by the key it sends ("sushi:3", or "dnevno:x2" for bread and extras).
# Prices always come from here, never from the browser. The menu's own "Доставка" line is the delivery fee.
DISHES, DELIVERY_FEE = {}, 100
for _cat in MENU:
    for _i, _it in enumerate(_cat["items"]):
        DISHES[f"{_cat['id']}:{_i}"] = {"name": _it["n"], "price": cents(_it["p"])}
    for _i, _it in enumerate(_cat.get("extras", [])):
        if _it["n"] == "Доставка":
            DELIVERY_FEE = cents(_it["p"])
        else:
            DISHES[f"{_cat['id']}:x{_i}"] = {"name": _it["n"], "price": cents(_it["p"])}

ORDER_FLOW = ("new", "preparing", "on_way", "delivered")
ORDER_STATUSES = ORDER_FLOW + ("cancelled",)
ORDER_STAMPS = {"preparing": "accepted_at", "on_way": "sent_at", "delivered": "delivered_at"}
KITCHEN_FROM, KITCHEN_UNTIL = 9, 1  # orders are taken from 9:00 until 1:00 at night
COURIERS_FILE = os.path.join(DATA, "couriers.json")


def kitchen_open(moment):
    return moment.hour >= KITCHEN_FROM or moment.hour < KITCHEN_UNTIL


def service_day(moment):
    """The working day an order belongs to: one placed at 00:30 counts for the evening before."""
    return (moment - dt.timedelta(hours=5)).date().isoformat()


def read_couriers():
    if not os.path.exists(COURIERS_FILE):
        write_couriers([{"id": 1, "name": "Доставчик 1"}, {"id": 2, "name": "Доставчик 2"}])
    with open(COURIERS_FILE, encoding="utf-8") as f:
        return json.load(f)


def write_couriers(couriers):
    with open(COURIERS_FILE, "w", encoding="utf-8") as f:
        json.dump(couriers, f, ensure_ascii=False, indent=2)


def check_order(r):
    if not kitchen_open(dt.datetime.now()):
        raise Bad(f"В момента не приемаме поръчки. Доставяме от {KITCHEN_FROM}:00 до {KITCHEN_UNTIL}:00.")
    lines = r.get("items")
    if not isinstance(lines, list) or not lines:
        raise Bad("Количката е празна.")
    if len(lines) > 60:
        raise Bad("Твърде много артикули в една поръчка. Обадете се.")
    items, subtotal = [], 0
    for line in lines:
        dish = DISHES.get(str(line.get("key"))) if isinstance(line, dict) else None
        if not dish:
            raise Bad("Някой от артикулите вече не е в менюто. Обновете страницата.")
        qty = as_int(line.get("qty"), "количество")
        if not 1 <= qty <= 30:
            raise Bad("Невалидно количество.")
        items.append({"key": line["key"], "name": dish["name"], "price": dish["price"], "qty": qty})
        subtotal += dish["price"] * qty

    def text(key, most):
        return str(r.get(key) or "").strip()[:most]

    order = {"name": text("name", 80), "phone": text("phone", 30), "town": text("town", 60) or "Радомир",
             "address": text("address", 160), "details": text("details", 160), "note": text("note", 500),
             "payment": r.get("payment"), "deliver_at": text("when", 5) or "asap"}
    if not order["name"]:
        raise Bad("Напишете име.")
    if len(re.sub(r"\D", "", order["phone"])) < 9:
        raise Bad("Напишете телефон, на който да ви потърсим.")
    if len(order["address"]) < 4:
        raise Bad("Напишете адрес за доставка.")
    if order["payment"] not in ("cash", "card"):
        raise Bad("Изберете начин на плащане.")
    if order["deliver_at"] != "asap" and not re.fullmatch(r"([01]\d|2[0-3]):[0-5]\d", order["deliver_at"]):
        raise Bad("Невалиден час за доставка.")
    return {**order, "items": json.dumps(items, ensure_ascii=False), "subtotal": subtotal,
            "fee": DELIVERY_FEE, "total": subtotal + DELIVERY_FEE}


def order_json(row):
    d = dict(row)
    d["items"] = json.loads(d["items"])
    return d


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    # ---------- static files ----------
    def hidden(self):
        parts = [p for p in unquote(urlparse(self.path).path).replace("\\", "/").split("/") if p]
        return bool(parts) and (parts[0] == "data" or parts[-1].endswith(".py") or any(p.startswith(".") for p in parts))

    def list_directory(self, path):
        self.send_error(HTTPStatus.NOT_FOUND)

    def end_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        if not self.path.startswith("/api/"):
            self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def do_GET(self):
        if self.path.startswith("/api/"):
            return self.api("GET")
        if self.hidden():
            return self.send_error(HTTPStatus.NOT_FOUND)
        super().do_GET()

    def do_HEAD(self):
        if self.path.startswith("/api/") or self.hidden():
            return self.send_error(HTTPStatus.NOT_FOUND)
        super().do_HEAD()

    def do_POST(self):
        self.api("POST")

    def do_PATCH(self):
        self.api("PATCH")

    def do_DELETE(self):
        self.api("DELETE")

    # ---------- API ----------
    def send_json(self, obj, status=HTTPStatus.OK, cookie=None):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        if cookie:
            self.send_header("Set-Cookie", cookie)
        self.end_headers()
        self.wfile.write(body)

    def body(self):
        if not self.headers.get("Content-Type", "").startswith("application/json"):
            raise Bad("Очаква се JSON.", HTTPStatus.UNSUPPORTED_MEDIA_TYPE)
        size = int(self.headers.get("Content-Length") or 0)
        if size > 10_000:
            raise Bad("Твърде голяма заявка.", HTTPStatus.REQUEST_ENTITY_TOO_LARGE)
        try:
            data = json.loads(self.rfile.read(size) or b"{}")
        except ValueError:
            raise Bad("Невалиден JSON.")
        if not isinstance(data, dict):
            raise Bad("Невалиден JSON.")
        return data

    def token(self):
        jar = SimpleCookie(self.headers.get("Cookie") or "")
        return jar[COOKIE].value if COOKIE in jar else None

    def is_staff(self):
        t = self.token()
        return bool(t) and sessions.get(t, 0) > time.time()

    def api(self, method):
        u = urlparse(self.path)
        path, q = u.path.rstrip("/"), parse_qs(u.query)
        ip = self.client_address[0]
        try:
            if method == "GET" and path == "/api/availability":
                return self.send_json(self.availability(q))
            if method == "POST" and path == "/api/reservations":
                if limited("book", ip, 8, 600):
                    raise Bad("Твърде много заявки. Опитайте по-късно или се обадете.", HTTPStatus.TOO_MANY_REQUESTS)
                rec = insert(check({**agreed(self.body()), "status": "pending"}, staff=False), "web")
                note_hit("book", ip)
                return self.send_json({"id": rec["id"], "status": rec["status"], "code": rec["code"]}, HTTPStatus.CREATED)
            if path in ("/api/booking", "/api/booking/cancel"):
                if limited("look", ip, 60, 600):
                    raise Bad("Твърде много заявки. Опитайте след малко.", HTTPStatus.TOO_MANY_REQUESTS)
                note_hit("look", ip)
                if method == "GET" and path == "/api/booking":
                    with connect() as con:
                        row = find_own(con, as_int(q.get("id", [""])[0], "номер"), q.get("code", [""])[0])
                    return self.send_json(guest_view(row))
                if method == "POST" and path == "/api/booking/cancel":
                    return self.send_json(self.guest_cancel(self.body()))
            if method == "GET" and path == "/api/orders/info":
                return self.send_json({"open": kitchen_open(dt.datetime.now()), "fee": DELIVERY_FEE,
                                       "from": KITCHEN_FROM, "until": KITCHEN_UNTIL})
            if method == "POST" and path == "/api/orders":
                if limited("order", ip, 6, 600):
                    raise Bad("Твърде много поръчки. Опитайте по-късно или се обадете.", HTTPStatus.TOO_MANY_REQUESTS)
                order = self.place_order(check_order(agreed(self.body())))
                note_hit("order", ip)
                return self.send_json({"id": order["id"], "total": order["total"]}, HTTPStatus.CREATED)
            if method == "POST" and path == "/api/admin/login":
                return self.login(ip)
            if method == "POST" and path == "/api/admin/logout":
                sessions.pop(self.token(), None)
                return self.send_json({"ok": True}, cookie=f"{COOKIE}=; HttpOnly; SameSite=Strict; Path=/api/admin; Max-Age=0")
            if not path.startswith("/api/admin/"):
                raise Bad("Няма такъв адрес.", HTTPStatus.NOT_FOUND)
            if not self.is_staff():
                raise Bad("Влезте отново.", HTTPStatus.UNAUTHORIZED)
            if method == "GET" and path == "/api/admin/me":
                return self.send_json({"ok": True})
            if method == "GET" and path == "/api/admin/reservations":
                return self.send_json(self.day_list(q))
            if method == "POST" and path == "/api/admin/reservations":
                data = self.body()
                return self.send_json(insert(check({"status": "confirmed", **data}, staff=True), "staff"), HTTPStatus.CREATED)
            if method == "GET" and path == "/api/admin/orders":
                return self.send_json(self.order_list(q))
            m = re.fullmatch(r"/api/admin/orders/(\d+)", path)
            if m and method == "PATCH":
                return self.send_json(self.update_order(int(m[1]), self.body()))
            m = re.fullmatch(r"/api/admin/couriers/(\d+)", path)
            if m and method == "PATCH":
                return self.send_json(self.rename_courier(int(m[1]), self.body()))
            m = re.fullmatch(r"/api/admin/reservations/(\d+)", path)
            if m and method == "PATCH":
                return self.send_json(self.update(int(m[1]), self.body()))
            if method == "POST" and path == "/api/admin/closures":
                return self.send_json(self.add_closure(self.body()), HTTPStatus.CREATED)
            m = re.fullmatch(r"/api/admin/closures/(\d+)", path)
            if m and method == "DELETE":
                with write_lock, connect() as con:
                    con.execute("DELETE FROM closures WHERE id = ?", (int(m[1]),))
                return self.send_json({"ok": True})
            raise Bad("Няма такъв адрес.", HTTPStatus.NOT_FOUND)
        except Bad as e:
            self.send_json({"error": str(e)}, e.status)

    def day_param(self, q):
        try:
            return dt.date.fromisoformat(q.get("day", [""])[0]).isoformat()
        except ValueError:
            raise Bad("Невалидна дата.")

    def availability(self, q):
        """Public: which tables are booked on a day and from what hour. No names or phones."""
        day = self.day_param(q)
        with connect() as con:
            rows = con.execute("SELECT table_id, hour FROM reservations WHERE day = ? AND table_id IS NOT NULL"
                               " AND status IN (?, ?, ?)", (day, *ACTIVE)).fetchall()
            whole, held = closed(con, day)
            shut = [r["day"] for r in con.execute("SELECT DISTINCT day FROM closures WHERE tables IS NULL AND day >= ?"
                                                  " ORDER BY day", (dt.date.today().isoformat(),))]
        return {"day": day, "duration": DURATION, "bookings": [{"table": r["table_id"], "hour": r["hour"]} for r in rows],
                "closed": whole, "blocked": sorted(held), "closed_days": shut}

    def day_list(self, q):
        forget_old()
        day = self.day_param(q)
        with connect() as con:
            rows = con.execute("SELECT * FROM reservations WHERE day = ? ORDER BY hour, id", (day,)).fetchall()
            waiting = con.execute("SELECT COUNT(*) FROM reservations WHERE status = 'pending' AND day >= ?",
                                  (dt.date.today().isoformat(),)).fetchone()[0]
            shut = con.execute("SELECT * FROM closures WHERE day = ? ORDER BY id", (day,)).fetchall()
        return {"day": day, "duration": DURATION, "reservations": [row_json(r) for r in rows], "pending_upcoming": waiting,
                "closures": [closure_json(r) for r in shut]}

    def guest_cancel(self, data):
        with write_lock, connect() as con:
            row = find_own(con, as_int(data.get("id"), "номер"), data.get("code") or "")
            if not guest_view(row)["can_cancel"]:
                raise Bad("Тази резервация вече не може да се откаже от тук. Обадете се.", HTTPStatus.CONFLICT)
            con.execute("UPDATE reservations SET status = 'cancelled', guest_cancelled = 1, updated_at = ? WHERE id = ?",
                        (stamp(), row["id"]))
            return guest_view(con.execute("SELECT * FROM reservations WHERE id = ?", (row["id"],)).fetchone())

    def add_closure(self, data):
        try:
            day = dt.date.fromisoformat(str(data.get("day"))).isoformat()
        except ValueError:
            raise Bad("Невалидна дата.")
        tables = data.get("tables")
        if tables is not None:
            if not isinstance(tables, list) or not tables or any(t not in TABLES for t in tables):
                raise Bad("Изберете маси.")
            tables = json.dumps(sorted(set(tables)))
        reason = str(data.get("reason") or "").strip()[:120]
        with write_lock, connect() as con:
            cur = con.execute("INSERT INTO closures (day, tables, reason, created_at) VALUES (?, ?, ?, ?)",
                              (day, tables, reason, stamp()))
            return closure_json(con.execute("SELECT * FROM closures WHERE id = ?", (cur.lastrowid,)).fetchone())

    def update(self, rid, data):
        with write_lock, connect() as con:
            row = con.execute("SELECT * FROM reservations WHERE id = ?", (rid,)).fetchone()
            if not row:
                raise Bad("Няма такава резервация.", HTTPStatus.NOT_FOUND)
            merged = {**row_json(row), **{k: v for k, v in data.items() if k in
                                           ("day", "hour", "table", "guests", "name", "phone", "note", "status")}}
            rec = check(merged, staff=True, kept_hour=row["hour"])
            hit = clash(con, rec, exclude=rid)
            if hit:
                raise Bad(f"Маса {rec['table_id']} е заета около {hit['hour']}:00 ({hit['name']}).", HTTPStatus.CONFLICT)
            # Staff changing the status takes over from a guest's own cancel
            con.execute("UPDATE reservations SET day = :day, hour = :hour, table_id = :table_id, guests = :guests, name = :name,"
                        " phone = :phone, note = :note, status = :status, updated_at = :now,"
                        " guest_cancelled = guest_cancelled AND status = :status WHERE id = :id",
                        {**rec, "now": stamp(), "id": rid})
            return row_json(con.execute("SELECT * FROM reservations WHERE id = ?", (rid,)).fetchone())

    # ---------- orders ----------
    def place_order(self, order):
        now = dt.datetime.now()
        with write_lock, connect() as con:
            cur = con.execute(
                "INSERT INTO orders (day, name, phone, town, address, details, note, payment, deliver_at, items,"
                " subtotal, fee, total, created_at, updated_at) VALUES (:day, :name, :phone, :town, :address, :details,"
                " :note, :payment, :deliver_at, :items, :subtotal, :fee, :total, :now, :now)",
                {**order, "day": service_day(now), "now": now.isoformat(timespec="seconds")})
            return order_json(con.execute("SELECT * FROM orders WHERE id = ?", (cur.lastrowid,)).fetchone())

    def order_list(self, q):
        day = self.day_param(q)
        with connect() as con:
            rows = con.execute("SELECT * FROM orders WHERE day = ? ORDER BY id", (day,)).fetchall()
            waiting = con.execute("SELECT COUNT(*) FROM orders WHERE status = 'new'").fetchone()[0]
        return {"day": day, "today": service_day(dt.datetime.now()), "orders": [order_json(r) for r in rows],
                "couriers": read_couriers(), "waiting": waiting, "fee": DELIVERY_FEE}

    def update_order(self, oid, data):
        couriers = {c["id"] for c in read_couriers()}
        with write_lock, connect() as con:
            row = con.execute("SELECT * FROM orders WHERE id = ?", (oid,)).fetchone()
            if not row:
                raise Bad("Няма такава поръчка.", HTTPStatus.NOT_FOUND)
            status, courier = data.get("status", row["status"]), data.get("courier", row["courier"])
            if status not in ORDER_STATUSES:
                raise Bad("Невалиден статус.")
            if courier is not None and courier not in couriers:
                raise Bad("Няма такъв доставчик.")
            if status in ("on_way", "delivered") and courier is None:
                raise Bad("Изберете доставчик.")
            now = stamp()
            stamps = {col: row[col] for col in ORDER_STAMPS.values()}
            if status != row["status"] and status != "cancelled":
                # Moving forward stamps the new step; moving back clears the steps after it
                for step, col in ORDER_STAMPS.items():
                    if ORDER_FLOW.index(step) > ORDER_FLOW.index(status):
                        stamps[col] = None
                    elif step == status:
                        stamps[col] = stamps[col] or now  # undoing a cancel keeps the original time
            con.execute("UPDATE orders SET status = ?, courier = ?, accepted_at = ?, sent_at = ?, delivered_at = ?,"
                        " updated_at = ? WHERE id = ?",
                        (status, courier, stamps["accepted_at"], stamps["sent_at"], stamps["delivered_at"], now, oid))
            return order_json(con.execute("SELECT * FROM orders WHERE id = ?", (oid,)).fetchone())

    def rename_courier(self, cid, data):
        name = str(data.get("name") or "").strip()[:40]
        if not name:
            raise Bad("Напишете име.")
        with write_lock:
            couriers = read_couriers()
            if not any(c["id"] == cid for c in couriers):
                raise Bad("Няма такъв доставчик.", HTTPStatus.NOT_FOUND)
            for c in couriers:
                if c["id"] == cid:
                    c["name"] = name
            write_couriers(couriers)
        return {"couriers": couriers}

    def login(self, ip):
        if limited("login", ip, 5, 300):
            raise Bad("Много грешни опити. Изчакайте 5 минути.", HTTPStatus.TOO_MANY_REQUESTS)
        given = str(self.body().get("password") or "")
        if not hmac.compare_digest(given.encode(), PASSWORD.encode()):
            note_hit("login", ip)
            raise Bad("Грешна парола.", HTTPStatus.UNAUTHORIZED)
        now = time.time()
        for t in [t for t, exp in sessions.items() if exp < now]:
            del sessions[t]
        t = secrets.token_urlsafe(32)
        sessions[t] = now + SESSION_SECONDS
        # Add "; Secure" here once the site is served over HTTPS
        return self.send_json({"ok": True}, cookie=f"{COOKIE}={t}; HttpOnly; SameSite=Strict; Path=/api/admin; Max-Age={SESSION_SECONDS}")


class Server(ThreadingHTTPServer):
    # On Windows, address reuse would let a second copy start on the same port without an error
    allow_reuse_address = os.name != "nt"


if __name__ == "__main__":
    args = sys.argv[1:]
    port = next((int(a) for a in args if a.isdigit()), 5173)
    host = os.environ.get("SUNNY_HOST", "127.0.0.1")
    url = f"http://localhost:{port}/"
    try:
        server = Server((host, port), Handler)
    except OSError:
        # Most likely the server is already running in another window
        print(f"Port {port} is already in use. If the site is already running, it is at {url}")
        if "--open" in args:
            webbrowser.open(url)
        sys.exit(1)
    forget_old()
    print("Sunny Complex is running. Keep this window open.")
    print(f"  Site:  {url}")
    print(f"  Staff: {url}admin/")
    if "--open" in args:
        webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
