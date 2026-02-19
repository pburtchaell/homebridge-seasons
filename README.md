# homebridge-seasons

[![npm](https://img.shields.io/npm/v/homebridge-seasons.svg?style=flat-square)](https://www.npmjs.com/package/homebridge-seasons)
[![downloads](https://img.shields.io/npm/dt/homebridge-seasons.svg?style=flat-square)](https://www.npmjs.com/package/homebridge-seasons)
[![license](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](LICENSE)
[![verified-by-homebridge](https://img.shields.io/badge/homebridge-verified-blueviolet?color=%23491F59&style=flat-square)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins)

Homebridge plugin that exposes the seasons of the year as HomeKit contact sensors for use in seasonal automations. 

## Acknowledgement 

This project is a fork of the original homebridge-seasons by @naofireblade, adding Homebridge UI configuration options and Homebridge 2.x support. It also updates the seasons to show in HomeKit as contact sensors for easy automation conditions. Thank you @naofireblade for creating the original code and for passing the original npm name on for this updated version.

## Requirements

- Node.js 20.0.0 or later
- Homebridge 1.8.0 or later (including Homebridge 2.x)

## Installation

### Using the Homebridge UI

Search for `homebridge-seasons` in the Homebridge UI plugin search and install it.

### Using npm

```bash
npm install -g homebridge-seasons
```

## Configuration

You can configure the plugin using the Homebridge UI or by editing your `config.json` directly.

### Example configuration

```json
"platforms": [
    {
        "platform": "Seasons",
        "hemisphere": "north",
        "useAstronomicCalendar": false
    }
]
```

### Configuration options

| Option | Required | Default | Description |
| --- | --- | --- | --- |
| `platform` | Yes | — | Must be `"Seasons"`. |
| `hemisphere` | No | `"north"` | `"north"` or `"south"`. Determines which hemisphere's seasons to use. |
| `useAstronomicCalendar` | No | `false` | When enabled, uses solstices and equinoxes for precise seasonal dates. When disabled, uses fixed months (e.g., Dec-Feb for Winter, Mar-May for Spring). |

## How it works

The plugin creates four HomeKit contact sensors — one for each season (Spring, Summer, Fall, Winter). The sensor for the current season reports as "Open" while the other three report as "Closed". This makes it easy to build HomeKit automations that trigger on seasonal changes, for example adjusting lighting scenes or thermostat schedules.

### Meteorologic calendar (default)

Seasons are determined by fixed month ranges:

| Season | Months |
| --- | --- |
| Spring | March – May |
| Summer | June – August |
| Fall | September – November |
| Winter | December – February |

### Astronomic calendar

When `useAstronomicCalendar` is enabled, seasons are determined by approximate solstice and equinox dates:

| Season | Start date |
| --- | --- |
| Spring | March 20 (Spring Equinox) |
| Summer | June 21 (Summer Solstice) |
| Fall | September 22 (Fall Equinox) |
| Winter | December 21 (Winter Solstice) |

If `hemisphere` is set to `"south"`, seasons are inverted (e.g., June is Winter instead of Summer).
