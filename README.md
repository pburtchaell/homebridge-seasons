# homebridge-seasons
[![npm](https://img.shields.io/npm/v/@pburtchaell/homebridge-seasons.svg?style=flat-square)](https://www.npmjs.com/package/@pburtchaell/homebridge-seasons)
[![npm](https://img.shields.io/npm/dt/@pburtchaell/homebridge-seasons.svg?style=flat-square)](https://www.npmjs.com/package/@pburtchaell/homebridge-seasons)
[![GitHub last commit](https://img.shields.io/github/last-commit/pburtchaell/homebridge-seasons.svg?style=flat-square)](https://github.com/pburtchaell/homebridge-seasons)

This is a plugin for [homebridge](https://github.com/homebridge/homebridge) that displays the current season of the year. You can download it via [npm](https://www.npmjs.com/package/@pburtchaell/homebridge-seasons).

This project is a fork of the [original plugin](https://github.com/naofireblade/homebridge-seasons) by [Arne Blumentritt](https://github.com/naofireblade). Thanks to Arne for creating and maintaining this plugin.

Feel free to leave any feedback [here](https://github.com/pburtchaell/homebridge-seasons/issues).

## Features

- Meteorologic season
- Astronomic season
- Nothern and southern hemisphere
- Number and name representation of the season

## Installation

1. Install homebridge using: `npm install -g homebridge`
2. Install this plugin using: `npm install -g @pburtchaell/homebridge-seasons`
3. Update your configuration file. See the samples below.

## Configuration

Add the following information to your config file.

- You can choose between the *meteorologic* and *astronomic* **calendar**.
- You can set your **hemisphere** between *north* and *south*.
- And you can decide whether you want to **display** the season as a *number* (0 = Spring), a *name* or *both*. The number representation can be used in homekit rules.


```json
"platforms": [
	{
		"platform": "Seasons",
		"name": "Seasons",
		"calendar": "meteorologic",
		"hemisphere": "north",
		"display": "both"
	}
]
```
