# Sunny Complex

Website for Sunny Complex, a pool and restaurant in Radomir, Bulgaria.

| Page | What it is |
|---|---|
| `/` | Home: pool, seasons, restaurant, reviews, contacts |
| `/menu/` | Full menu, with a cart for home delivery |
| `/reservation/` | Table booking on the floor plan |
| `/reservation/status/` | The guest's own booking: confirmed or not, and cancel it |
| `/privacy/` | Privacy policy (linked from the booking and checkout forms) |
| `/admin/` | Staff: reservations, closing a day or blocking tables |
| `/deliveries/` | Staff: delivery orders and the two couriers |

After booking, the guest gets a link to `/reservation/status/?id=…&c=…` (also kept in their browser).
It shows whether the staff confirmed the table and lets them cancel it until the booked hour.

In `/admin/`, **Затвори деня или маси** closes the whole restaurant for the chosen day or blocks
tables or whole halls, e.g. for a private party. The booking page then won't offer them. Bookings already
made stay, and the admin says how many, so someone can call those guests. Events themselves are
arranged by phone (the "Празници" section on the home page).

Names, phones, addresses and notes are wiped automatically from bookings and orders older than
12 months, as the privacy page says.

## Running it

Bookings, orders and the staff pages need the small server in `server.py` (Python 3, standard library only):

```
python server.py 5173 --open
```

On Windows, double-click `start.bat`. The site is then at http://localhost:5173/.

The staff password is created on first run in `data/admin-password.txt`, or set it with the
`SUNNY_ADMIN_PASSWORD` environment variable. Reservations and orders are stored in `data/`,
which is never served to visitors and is not part of this repository.

## On a static host (GitHub Pages): demo mode

There is no server there, so `assets/demo-api.js` answers the same calls inside the browser and
keeps bookings, orders and couriers in that browser's localStorage, with the same rules as
`server.py`. Everything works for a demo, but only on the one device: a booking made on a phone
does not reach /admin on a laptop. The staff pages open without a password (any password works
after signing out) and show a "Демо" bar with **Примерен ден** (fill today with sample bookings
and orders) and **Изчисти** (start empty).

On localhost the real `server.py` is always used, never demo mode.

## Moving to the site's own domain

Link previews (Facebook, Viber) need full addresses. The `og:url` and `og:image` tags in `index.html`,
`menu/`, `reservation/` and `privacy/` point at `https://izu83.github.io/SunnyComplex/`. Change them to
the new domain when the site moves. The picture is `assets/share.jpg`.
