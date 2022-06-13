const getAlfredEnv = key => process.env[`alfred_${key}`]

/**
 * 日志级别枚举
 */
 const LOGGER_LEVEL = {
    ERROR: [1, 'ERROR'],
    WARN: [2, 'WARN'],
    INFO: [3, 'INFO'],
    DEBUG: [4, 'DEBUG']
}

/**
 * 日志输出类型
 */
const LOGGER_APPENDER = {
    FILE:  'file',
    CONSOLE: 'console',
    ALL: ['file', 'console']
}

config = {
    logger: {
        logpath: getAlfredEnv('workflow_data'),
        logfile: `${getAlfredEnv('workflow_bundleid')}.log`,
        level: getAlfredEnv('debug') ? LOGGER_LEVEL.DEBUG : LOGGER_LEVEL.INFO,
        appender: LOGGER_APPENDER.FILE
    },
    cache: {
        datapath: getAlfredEnv('workflow_cache'),
        cachename: getAlfredEnv('workflow_bundleid')
    },
    data: {
        datapath: getAlfredEnv('workflow_data'),
        dataname: getAlfredEnv('workflow_bundleid')
    }
}

module.exports = {config, LOGGER_APPENDER, LOGGER_LEVEL}