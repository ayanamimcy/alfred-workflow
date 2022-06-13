const fs = require('fs')
const path = require('path')
const {Logger} = require('./logger')
const {config} = require('./config')


class Config {

    constructor (data_path, filename) {
        this.data_path = data_path
        this.filename = filename
        this.configfile = path.join(this.data_path, this.filename)
        this.data = this.#_loaddata() ? JSON.parse(this.#_loaddata()) : {}
        this.logger = new Logger(config)
    }

    set(key, value) {
        this.data[key] = value
        this.#_savedata()
    }

    get(key) {
        return this.data[key]
    }

    del(key) {
        delete this.data[key]
        this.#_savedata()
    }

    has(key) {
        return key in this.data
    }

    clean() {
        this.data = {}
        this.#_savedata()
    }

    #_savedata () {
        fs.promises.access(this.data_path, fs.constants.F_OK)
            .catch(err => fs.promises.mkdir(this.data_path))
            .then(() => fs.promises.writeFile(this.configfile, JSON.stringify(this.data), {flag: 'w+'}))
    }

    #_loaddata() {
        try {
            return fs.readFileSync(this.configfile, "utf-8")
        } catch (err) {
            return NaN
        }
        
    }
}

class Data extends Config {

    constructor(data_path, data_name) {
        const filename = data_name + "." + "data.json"
        super(data_path, filename)
    }

}

class Cache extends Config {

    constructor(data_path, cache_name) {
        const filename = cache_name + "." + "cache.json"
        super(data_path, filename)
    }

    set(key, value, max_age = 0) {
        const data = {
            "value": value,
            "max_age": max_age,
            "timesnap": Date.now()
        }
        super.set(key, data)
        logger.debug(`cache data was set success, key ${key}, value ${value}, age ${max_age}`)
    }

    get(key) {
        if(!super.has(key)) {
            return
        }

        // 计算max_age
        const max_age = super.get(key).max_age
        const timesnap = super.get(key).timesnap

        if (max_age && timesnap && max_age > 0 && (Date.now() - timesnap > max_age * 1000)) {
            logger.debug(`cache data key ${key} expired, age ${max_age}`)
            super.del(key)
            return
        }

        return super.get(key).value
    }

}

module.exports = {Data, Cache}