const fs = require('fs')
const process = require('process')
const xml2js = require('./xml2js')
const request = require('./request')
const {Data, Cache} = require("./cache")
const {Logger} = require("./logger")
const {config, LOGGER_APPENDER, LOGGER_LEVEL} = require('./config')

const workflow4 = {}
const _this = workflow4;


/**
 * 全局参数：相关参数的使用说明可以参考 https://www.alfredapp.com/help/workflows/inputs/script-filter/json/
 */
// 输出的总条目
const _items = []
// 全局变量
const _variables = {}
// return值
const _return = 0
// 输出值
const _arg = 0

const inputIsEmpty = (process.argv.slice(2).length === 0) || (process.argv.slice(2).length === 1 && process.argv.slice(2)[0] === '')
const getSystemIcon = name => `/System/Library/CoreServices/CoreTypes.bundle/Contents/Resources/${name}.icns`;
const getAlfredEnv = key => process.env[`alfred_${key}`]
const getEnv = key => process.env[`${key}`]

class Item {
    constructor(title, sub_title = '', arg=NaN, autocomplete=NaN, valid=true, uid=NaN, 
    icon=NaN, icontype=NaN, type=NaN, largetext=NaN, copytext=NaN, quicklookurl=NaN, sort = NaN
    ) {
        this.title = title;
        this.sub_title = sub_title;
        this.arg = arg;
        this.autocomplete = autocomplete;
        this.valid = valid;
        this.uid = uid;
        this.icon = icon;
        this.icontype = icontype;
        this.type = type;
        this.largetext = largetext;
        this.copytext = copytext;
        this.quicklookurl = quicklookurl;
        this.variables = {};
        this.mods = {}
        this.action = {}
        this.sort = sort ? sort : 100000 - _items.length
    }

    obj() {
        const result = {
            "title": this.title,
            "subtitle": this.sub_title,
            "valid": this.valid
        }

        if (this.arg) result.arg = this.arg;
        if (this.autocomplete) result.autocomplete = this.autocomplete;
        if (this.uid) result.uid = this.uid;
        if (this.quicklookurl) result.quicklookurl = this.quicklookurl;
        if (this.type) result.type = this.type;

        result.text = this.#_getText()
        result.icon = this.#_getIcon()
        result.mods = this.mods
        result.action = this.action
        result.variables = this.variables

        return result;
    }

    #_getIcon() {
        
        const icon = {}
        if (this.icon) icon.path = this.icon
        if (this.icontype) icon.type = this.icontype

        return icon
    }

    #_getText() {
        const text = {}

        if(this.copytext) text.copy = this.copytext;
        if(this.largetext) text.largetype = this.largetext;

        return text
    }
}


// =================一些工具类和工具函数===================
_this.utils = {}
_this.utils.xml2js = xml2js
_this.utils.request = request
_this.utils.loadfile = (file, encode = 'utf-8') => {
    try {
        fs.accessSync(file, fs.constants.R_OK)
        return fs.readFileSync(file, encode)
    } catch (err) {
        return
    }
}
// ==============================================

// 当前流水线的基本信息
_this.current_info = {
    name: getAlfredEnv('workflow_name'),
    version: getAlfredEnv('workflow_version'),
    bundleid: getAlfredEnv('workflow_bundleid'),
    uid: getAlfredEnv('workflow_uid'),
    data: getAlfredEnv('workflow_data'),
	cache: getAlfredEnv('workflow_cache')
}

// alfred的基本信息
_this.alfred_info = {
    version: getAlfredEnv('version'),
	theme: getAlfredEnv('theme'),
	themeBackground: getAlfredEnv('theme_background'),
	themeSelectionBackground: getAlfredEnv('theme_selection_background'),
	themeSubtext: Number(getAlfredEnv('theme_subtext')),
	preferences: getAlfredEnv('preferences'),
	preferencesLocalHash: getAlfredEnv('preferences_localhash'),
    debug: getAlfredEnv('debug'),
    loginuser: getEnv('LOGNAME'),
    userhome: getEnv('HOME')
}

// 获取当前系统基本图标
_this.system_icon = {
	get: getSystemIcon,
	info: getSystemIcon('ToolbarInfo'),
	warning: getSystemIcon('AlertCautionIcon'),
	error: getSystemIcon('AlertStopIcon'),
	alert: getSystemIcon('Actions'),
	like: getSystemIcon('ToolbarFavoritesIcon'),
	delete: getSystemIcon('ToolbarDeleteIcon'),
};

// ================配置类=========================
_this.config = config
_this.const = {LOGGER_APPENDER, LOGGER_LEVEL}
_this.changeconfig = () => {
    _this.cache = new Cache(_this.config.cache.datapath, _this.config.cache.cachename)
    _this.data = new Data(_this.config.data.datapath, _this.config.data.dataname)
    _this.logger = new Logger(_this.config.logger)
}
// ===============================================

// 缓存相关
_this.cache = new Cache(_this.config.cache.datapath, _this.config.cache.cachename)
_this.data = new Data(_this.config.data.datapath, _this.config.data.dataname)

// 系统输入
_this.input = {
    isEmpty: inputIsEmpty,
    value: inputIsEmpty ? [] : process.argv.slice(2),
    default: process.argv[2]
};

// 日志
_this.logger = new Logger(_this.config.logger)

// 构建输出
_this.add_item = ({title, sub_title = '', arg=NaN, autocomplete=NaN, valid=true, uid=NaN, 
icon=NaN, icontype=NaN, type=NaN, largetext=NaN, copytext=NaN, quicklookurl=NaN, sort=NaN}) => {
    _items.push(new Item(title, sub_title, arg, autocomplete, valid, uid, 
    icon, icontype, type, largetext, copytext, quicklookurl, sort))
}

_this.setVar = (key, value ) => _variables[key] = value
_this.getVar = (key) => getEnv(key)

_this.setReturn = (value) => _return = value
_this.getReturn = () => _return

_this.setArg = (value) => _arg = value
_this.getArg = () => _arg

_this.getItmes = () => _items
_this.setItems = (value) => _items = value


// 系统输出
_this.match = (key) => _this.outputs(item => {
    return item.title.toLowerCase().includes(key.toLowerCase()) 
    || item.sub_title.toLowerCase().includes(key.toLowerCase()) 
    || item.arg.toLowerCase().includes(key.toLowerCase())
})


_this.outputs = (filterfunction = item => true) => {
    const result = {items: _items.filter(filterfunction).sort((item1, item2) => item2.sort - item1.sort).map((v) => v.obj()), variables: _variables}
    const alfredworkflow = {variables: _variables}

    if (_arg) alfredworkflow.arg = _arg
    if (_return > 0) result.return = _return

    result.alfredworkflow = alfredworkflow

    console.log(JSON.stringify(result))
}

_this.notify = (title, sub_title = '', arg = title) => {
    const items = [new Item(title, sub_title, arg).obj()]
    console.log(JSON.stringify(items))
}

module.exports = _this;