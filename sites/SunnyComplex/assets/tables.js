/* The restaurant's tables, drawn from the owner's sketch. Read by floor.js in the browser and by server.py.
   Keep the part after "window.FLOOR_DATA =" valid JSON (double quotes, no trailing commas).
   open / last: the first and last hour a table can be booked for.
   duration: hours a booking holds its table. With 2, a booking at 20:00 blocks the same table
   at 19:00, 20:00 and 21:00; the nearest free starts are 18:00 and 22:00. */
window.FLOOR_DATA = {
  "open": 9,
  "last": 21,
  "duration": 2,
  "zones": { "smoke": "Пушачи", "clean": "Непушачи" },
  "tables": [
    { "id": 1,  "zone": "smoke", "seats": 6, "x": 46,  "y": 100, "w": 72, "h": 44 },
    { "id": 2,  "zone": "smoke", "seats": 6, "x": 136, "y": 100, "w": 72, "h": 44 },
    { "id": 3,  "zone": "smoke", "seats": 6, "x": 226, "y": 100, "w": 72, "h": 44 },
    { "id": 4,  "zone": "smoke", "seats": 6, "x": 316, "y": 100, "w": 72, "h": 44 },
    { "id": 5,  "zone": "smoke", "seats": 2, "x": 408, "y": 104, "w": 36, "h": 36 },
    { "id": 6,  "zone": "smoke", "seats": 6, "x": 64,  "y": 226, "w": 60, "h": 60 },
    { "id": 7,  "zone": "smoke", "seats": 6, "x": 170, "y": 232, "w": 84, "h": 48 },
    { "id": 8,  "zone": "smoke", "seats": 6, "x": 290, "y": 232, "w": 96, "h": 48 },
    { "id": 9,  "zone": "smoke", "seats": 6, "x": 44,  "y": 370, "w": 66, "h": 44 },
    { "id": 10, "zone": "smoke", "seats": 6, "x": 128, "y": 370, "w": 66, "h": 44 },
    { "id": 11, "zone": "smoke", "seats": 6, "x": 212, "y": 370, "w": 66, "h": 44 },
    { "id": 12, "zone": "smoke", "seats": 6, "x": 296, "y": 370, "w": 66, "h": 44 },
    { "id": 13, "zone": "smoke", "seats": 4, "x": 388, "y": 370, "w": 44, "h": 44 },
    { "id": 21, "zone": "clean", "seats": 6, "x": 588, "y": 101, "w": 84, "h": 44 },
    { "id": 22, "zone": "clean", "seats": 6, "x": 692, "y": 100, "w": 90, "h": 46 },
    { "id": 23, "zone": "clean", "seats": 6, "x": 802, "y": 100, "w": 90, "h": 46 },
    { "id": 24, "zone": "clean", "seats": 6, "x": 912, "y": 100, "w": 82, "h": 46 },
    { "id": 25, "zone": "clean", "seats": 2, "x": 598, "y": 196, "w": 36, "h": 36 },
    { "id": 26, "zone": "clean", "seats": 4, "round": true, "cx": 722, "cy": 226, "r": 26 },
    { "id": 27, "zone": "clean", "seats": 4, "round": true, "cx": 812, "cy": 226, "r": 26 },
    { "id": 28, "zone": "clean", "seats": 4, "round": true, "cx": 900, "cy": 226, "r": 26 },
    { "id": 29, "zone": "clean", "seats": 6, "x": 597, "y": 277, "w": 86, "h": 46, "rot": -32 },
    { "id": 31, "zone": "clean", "seats": 6, "x": 702, "y": 382, "w": 88, "h": 46 },
    { "id": 32, "zone": "clean", "seats": 6, "x": 812, "y": 382, "w": 84, "h": 46, "booth": true },
    { "id": 33, "zone": "clean", "seats": 6, "x": 912, "y": 382, "w": 84, "h": 46, "booth": true }
  ]
};
