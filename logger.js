const path = require('path')
const fs = require('fs')
const moment = require('./moment');
const {config, LOGGER_APPENDER, LOGGER_LEVEL} = require('./config')

/**
 * 通过异常堆栈，获取到日志的具体文件信息
 * @returns none
 */
function getCallerFileNameAndLine() {
    const stack = Error().stack;

    const stackArr = stack.split('\n');
    let callerLogIndex = 0;
    for (let i = 0; i < stackArr.length; i++) {
        if (stackArr[i].indexOf('Logger.') > 0 && i + 1 < stackArr.length) {
            callerLogIndex = i + 1;
            break;
        }
    }

    if (callerLogIndex !== 0) {
        const callerStackLine = stackArr[callerLogIndex];
        return `${callerStackLine.substring(callerStackLine.lastIndexOf(path.sep) + 1, callerStackLine.lastIndexOf(':'))}`;
    } else {
        return '-';
    }
}
/**
 * LoggingEvent，日志输出对象
 */
class LoggingEvent {

    constructor({timestamp, level, message, processId, loggerName}) {
        this.timestamp = timestamp
        this.level = level
        this.message = message
        this.processId = processId
        this.loggerName = loggerName
    }

    tostring() {
        return `[${this.timestamp}] [${this.level}] [${this.processId}] [${this.loggerName}] ${this.message} \n`
    }
}

/**
 * 日志输出组件
 */
class ConsoleAppender {

    constructor() {
        this.out = process.stdout
    }

    append({loggerevent, ...option}) {
        this.out.write(loggerevent.tostring())
    }
}

class FileAppender {

    constructor() {
        
    }

    append({loggerevent, ...option}) {
        const logpath = option.logpath
        const logfile = option.logfile
        if (!logpath || !logfile) return
        this.#create_path(logpath);
        const writerStream = fs.createWriteStream(path.join(logpath, logfile), {flags: 'a+'})
        writerStream.write(loggerevent.tostring())
        writerStream.end()

    }

    #create_path(logpath) {
        fs.promises.access(logpath, fs.constants.F_OK)
            .catch(err => fs.promises.mkdir(logpath))
    }

}

const LOGGER_APPENDER_REGISTER = {
    console: new ConsoleAppender(),
    file: new FileAppender()
}


/**
 * 1. 基本配置信息：
 *      日志路径
 *      日志格式
 */
class Logger {

    constructor({logpath = NaN, logfile = NaN, level = LOGGER_LEVEL.INFO, appender = 'console'} = {}) {
        this.logpath = logpath,
        this.logfile = logfile,
        this.level = level,
        this.appender = appender
    }

    info(msg) {
        this.#filterAndAppender(LOGGER_LEVEL.INFO, msg)
    }

    warn(msg) {
        this.#filterAndAppender(LOGGER_LEVEL.WARN, msg)
    }

    error(msg) {
        this.#filterAndAppender(LOGGER_LEVEL.ERROR, msg)
    }

    debug(msg) {
        this.#filterAndAppender(LOGGER_LEVEL.DEBUG, msg)
    }

    #filterAndAppender(level, msg) {
        if (this.level[0] < level[0]) return
        const logging = {
            timestamp: moment(Date.now()).format('YYYY-MM-DD HH:mm:ss'),
            level: level[1], 
            message: msg, 
            processId: process.pid, 
            loggerName: getCallerFileNameAndLine()

        }
        LOGGER_APPENDER_REGISTER[this.appender].append({loggerevent: new LoggingEvent(logging), logpath: this.logpath, logfile: this.logfile})
    }
}

const getAlfredEnv = key => process.env[`alfred_${key}`]
module.exports = {Logger}