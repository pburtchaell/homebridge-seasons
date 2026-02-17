"use strict";

const CustomUUID = {
  SeasonService: "ca741310-c62e-454b-a63b-3a1db3ca2c3a",
  SeasonCharacteristic: "9382ccde-6cab-42e7-877a-2df98b8d0b66",
  SeasonNameCharacteristic: "02e4c0e3-44f9-44b8-8667-98f54b376ce4",
};

const Seasons = {
  Spring: "Spring",
  Summer: "Summer",
  Autumn: "Autumn",
  Winter: "Winter",
};

const SeasonNumber = {
  [Seasons.Spring]: 0,
  [Seasons.Summer]: 1,
  [Seasons.Autumn]: 2,
  [Seasons.Winter]: 3,
};

let Service;
let Characteristic;
let Formats;
let Perms;
let SeasonService;
let SeasonCharacteristic;
let SeasonNameCharacteristic;

module.exports = function (homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  Formats = homebridge.hap.Formats;
  Perms = homebridge.hap.Perms;

  // Custom Season Service
  SeasonService = class extends Service {
    constructor(displayName, subtype) {
      super(displayName, CustomUUID.SeasonService, subtype);
    }
  };

  // Custom Season Characteristic (numeric value 0-3)
  SeasonCharacteristic = class extends Characteristic {
    constructor() {
      super("Season", CustomUUID.SeasonCharacteristic);
      this.setProps({
        format: Formats.UINT8,
        maxValue: 3,
        minValue: 0,
        minStep: 1,
        perms: [Perms.READ, Perms.NOTIFY],
      });
      this.value = this.getDefaultValue();
    }
  };

  // Custom Season Name Characteristic (string value)
  SeasonNameCharacteristic = class extends Characteristic {
    constructor() {
      super("Season Name", CustomUUID.SeasonNameCharacteristic);
      this.setProps({
        format: Formats.STRING,
        perms: [Perms.READ, Perms.NOTIFY],
      });
      this.value = this.getDefaultValue();
    }
  };

  homebridge.registerPlatform("@pburtchaell/homebridge-seasons", "Seasons", SeasonsPlatform);
};

class SeasonsPlatform {
  constructor(log, config) {
    this.log = log;
    this.config = config;
  }

  accessories(callback) {
    const accessories = [];
    accessories.push(new SeasonsAccessory(this));
    callback(accessories);
  }
}

class SeasonsAccessory {
  constructor(platform) {
    this.log = platform.log;
    this.config = platform.config;
    this.name = "Season";

    // Get calendar type from config (default: meteorologic)
    this.calendar = this.config.calendar || "meteorologic";

    // Get hemisphere from config (default: north)
    this.hemisphere = this.config.hemisphere || "north";

    // Get display mode from config (default: both)
    this.display = this.config.display || "both";

    // Setup accessory information service
    this.informationService = new Service.AccessoryInformation();
    this.informationService
      .setCharacteristic(Characteristic.Manufacturer, "Homebridge Seasons")
      .setCharacteristic(Characteristic.Model, "Seasons Sensor")
      .setCharacteristic(Characteristic.SerialNumber, "HB-SEASONS-001")
      .setCharacteristic(Characteristic.FirmwareRevision, "1.0.0");

    // Create season service and add characteristics depending on config
    this.seasonService = new SeasonService(this.name);

    if (this.display === "both" || this.display === "number") {
      this.seasonService.addCharacteristic(SeasonCharacteristic);
      this.seasonService
        .getCharacteristic(SeasonCharacteristic)
        .on("get", this.getCurrentSeason.bind(this));
    }

    if (this.display === "both" || this.display === "name") {
      this.seasonService.addCharacteristic(SeasonNameCharacteristic);
      this.seasonService
        .getCharacteristic(SeasonNameCharacteristic)
        .on("get", this.getCurrentSeasonName.bind(this));
    }
  }

  identify(callback) {
    this.log.debug("Identify requested");
    callback();
  }

  getServices() {
    return [this.informationService, this.seasonService];
  }

  getCurrentSeason(callback) {
    this.getCurrentSeasonName((error, name) => {
      callback(null, SeasonNumber[name]);
    });
  }

  getCurrentSeasonName(callback) {
    let season;

    if (this.calendar === "meteorologic") {
      this.log.debug("Using meteorologic calendar to get current season");
      season = this.getMeteorologicSeason(new Date());
    } else {
      this.log.debug("Using astronomic calendar to get current season");
      const northernHemisphere = this.hemisphere === "north";
      this.log.debug("Hemisphere is " + (northernHemisphere ? "north" : "south"));
      season = this.getAstronomicSeason(new Date(), northernHemisphere);
    }

    this.log.debug("Current season is " + season);
    callback(null, season);
  }

  getMeteorologicSeason(date) {
    const month = date.getMonth() + 1;

    if (month >= 3 && month <= 5) { return Seasons.Spring; }
    if (month >= 6 && month <= 8) { return Seasons.Summer; }
    if (month >= 9 && month <= 11) { return Seasons.Autumn; }
    return Seasons.Winter;
  }

  /**
   * Calculate astronomical season based on solstices and equinoxes.
   * Approximate dates (varies by ~1 day year to year):
   * - Spring Equinox: March 20
   * - Summer Solstice: June 21
   * - Autumn Equinox: September 22
   * - Winter Solstice: December 21
   */
  getAstronomicSeason(date, northernHemisphere) {
    const month = date.getMonth() + 1;
    const day = date.getDate();

    let season;

    if ((month === 3 && day >= 20) || month === 4 || month === 5 || (month === 6 && day < 21)) {
      season = Seasons.Spring;
    } else if ((month === 6 && day >= 21) || month === 7 || month === 8 || (month === 9 && day < 22)) {
      season = Seasons.Summer;
    } else if ((month === 9 && day >= 22) || month === 10 || month === 11 || (month === 12 && day < 21)) {
      season = Seasons.Autumn;
    } else {
      season = Seasons.Winter;
    }

    if (!northernHemisphere) {
      const opposite = {
        [Seasons.Spring]: Seasons.Autumn,
        [Seasons.Summer]: Seasons.Winter,
        [Seasons.Autumn]: Seasons.Spring,
        [Seasons.Winter]: Seasons.Summer,
      };
      season = opposite[season];
    }

    return season;
  }
}
