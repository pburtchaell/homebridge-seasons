"use strict";

const Seasons = {
  Spring: "Spring",
  Summer: "Summer",
  Fall: "Fall",
  Winter: "Winter",
};

let Service;
let Characteristic;

module.exports = function (homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;

  homebridge.registerPlatform("@pburtchaell/homebridge-seasons", "Homebridge Seasons", SeasonsPlatform);
};

class SeasonsPlatform {
  constructor(log, config) {
    this.log = log;
    this.config = config;
  }

  accessories(callback) {
    const seasons = [Seasons.Spring, Seasons.Summer, Seasons.Fall, Seasons.Winter];
    callback(seasons.map(name => new SeasonContactSensorAccessory(this, name)));
  }
}

class SeasonContactSensorAccessory {
  constructor(platform, seasonName) {
    this.log = platform.log;
    this.config = platform.config;
    this.name = seasonName;
    this.seasonName = seasonName;

    // Get hemisphere from config (default: north)
    this.hemisphere = this.config.hemisphere || "north";

    // Setup accessory information service
    this.informationService = new Service.AccessoryInformation();
    this.informationService
      .setCharacteristic(Characteristic.Manufacturer, "Homebridge Seasons")
      .setCharacteristic(Characteristic.Model, "Seasons Sensor")
      .setCharacteristic(Characteristic.SerialNumber, "HB-SEASONS-" + seasonName.toUpperCase())
      .setCharacteristic(Characteristic.FirmwareRevision, "1.0.0");

    // Create contact sensor service
    this.contactSensorService = new Service.ContactSensor(this.name);
    this.contactSensorService
      .getCharacteristic(Characteristic.ContactSensorState)
      .on("get", this.getContactState.bind(this));
  }

  identify(callback) {
    this.log.debug("Identify requested for " + this.seasonName);
    callback();
  }

  getServices() {
    return [this.informationService, this.contactSensorService];
  }

  getContactState(callback) {
    let currentSeason;

    if (this.config.useAstronomicCalendar) {
      const northernHemisphere = this.hemisphere === "north";
      currentSeason = this.getAstronomicSeason(new Date(), northernHemisphere);
    } else {
      currentSeason = this.getMeteorologicSeason(new Date());
    }

    this.log.debug(this.seasonName + " sensor: current season is " + currentSeason);

    const isActive = currentSeason === this.seasonName;
    callback(null, isActive
      ? Characteristic.ContactSensorState.CONTACT_NOT_DETECTED
      : Characteristic.ContactSensorState.CONTACT_DETECTED,
    );
  }

  getMeteorologicSeason(date) {
    const month = date.getMonth() + 1;

    if (month >= 3 && month <= 5) { return Seasons.Spring; }
    if (month >= 6 && month <= 8) { return Seasons.Summer; }
    if (month >= 9 && month <= 11) { return Seasons.Fall; }
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
      season = Seasons.Fall;
    } else {
      season = Seasons.Winter;
    }

    if (!northernHemisphere) {
      const opposite = {
        [Seasons.Spring]: Seasons.Fall,
        [Seasons.Summer]: Seasons.Winter,
        [Seasons.Fall]: Seasons.Spring,
        [Seasons.Winter]: Seasons.Summer,
      };
      season = opposite[season];
    }

    return season;
  }
}
