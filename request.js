const path = require('path')
const http = require('http')
const https = require('https')
const qs = require('querystring')
const zlib = require('zlib')
const {URL} = require('url')
const supportedCompressions = ['gzip', 'deflate']

class CentraResponse {
    constructor(res, resOptions) {
        this.coreRes = res
        this.resOptions = resOptions

        this.body = Buffer.alloc(0)

        this.headers = res.headers
        this.statusCode = res.statusCode
    }
    _addChunk(chunk) {
        this.body = Buffer.concat([this.body, chunk])
    }
    async json() {
        return this.statusCode === 204 ? null : JSON.parse(this.body)
    }
    async text() {
        return this.body.toString()
    }
}

class Client {
    constructor(url, method = 'GET') {
        this.url = typeof url === 'string' ? new URL(url) : url
        this.method = method
        this.data = null
        this.sendDataAs = null
        this.reqHeaders = {}
        this.streamEnabled = false
        this.compressionEnabled = false
        this.timeoutTime = null
        this.coreOptions = {}

        this.resOptions = {
            'maxBuffer': 50 * 1999900 // 50 MB
        }

        return this
    }

    query(a1, a2) {
        if (typeof a1 === 'object') {
            Object.keys(a1).forEach((queryKey) => {
                this.url.searchParams.append(queryKey, a1[queryKey])
            })
        } else this.url.searchParams.append(a1, a2)

        return this
    }

    path(relativePath) {
        this.url.pathname = path.join(this.url.pathname, relativePath)

        return this
    }

    body(data, sendAs) {
        this.sendDataAs = typeof data === 'object' && !sendAs && !Buffer.isBuffer(data) ? 'json' : (sendAs ? sendAs.toLowerCase() : 'buffer')
        this.data = (this.sendDataAs === 'form' || this.sendDataAs === 'form-data') ? qs.stringify(data) : (this.sendDataAs === 'json' ? JSON.stringify(data) : data)

        return this
    }

    header(a1, a2) {
        if (typeof a1 === 'object') {
            Object.keys(a1).forEach((headerName) => {
                this.reqHeaders[headerName.toLowerCase()] = a1[headerName]
            })
        } else this.reqHeaders[a1.toLowerCase()] = a2

        return this
    }

    timeout(timeout) {
        this.timeoutTime = timeout

        return this
    }

    option(name, value) {
        this.coreOptions[name] = value

        return this
    }

    stream() {
        this.streamEnabled = true

        return this
    }

    compress() {
        this.compressionEnabled = true

        if (!this.reqHeaders['accept-encoding']) this.reqHeaders['accept-encoding'] = supportedCompressions.join(', ')

        return this
    }

    send() {
        return new Promise((resolve, reject) => {
            if (this.data) {
                if (!this.reqHeaders.hasOwnProperty('content-type')) {
                    if (this.sendDataAs === 'json') {
                        this.reqHeaders['content-type'] = 'application/json'
                    } else if (this.sendDataAs === 'form' || this.sendDataAs ===  'form-data') {
                        this.reqHeaders['content-type'] = 'application/x-www-form-urlencoded'
                    }
                }

                if (!this.reqHeaders.hasOwnProperty('content-length')) {
                    this.reqHeaders['content-length'] = Buffer.byteLength(this.data)
                }
            }

            const options = Object.assign({
                'protocol': this.url.protocol,
                'host': this.url.hostname,
                'port': this.url.port,
                'path': this.url.pathname + (this.url.search === null ? '' : this.url.search),
                'method': this.method,
                'headers': this.reqHeaders
            }, this.coreOptions)

            let req

            const resHandler = (res) => {
                let stream = res

                if (this.compressionEnabled) {
                    if (res.headers['content-encoding'] === 'gzip') {
                        stream = res.pipe(zlib.createGunzip())
                    } else if (res.headers['content-encoding'] === 'deflate') {
                        stream = res.pipe(zlib.createInflate())
                    }
                }

                let centraRes

                if (this.streamEnabled) {
                    resolve(stream)
                } else {
                    centraRes = new CentraResponse(res, this.resOptions)

                    stream.on('error', (err) => {
                        reject(err)
                    })

                    

                    stream.on('data', (chunk) => {
                        centraRes._addChunk(chunk)

                        if (this.resOptions.maxBuffer !== null && centraRes.body.length > this.resOptions.maxBuffer) {
                            stream.destroy()

                            reject('Received a response which was longer than acceptable when buffering. (' + this.body.length + ' bytes)')
                        }
                    })

                    stream.on('end', () => {
                        resolve(centraRes)
                    })
                }
            }

            if (this.url.protocol === 'http:') {
                req = http.request(options, resHandler)
            } else if (this.url.protocol === 'https:') {
                req = https.request(options, resHandler)
            } else throw new Error('Bad URL protocol: ' + this.url.protocol)

            if (this.timeoutTime) {
                req.setTimeout(this.timeoutTime, () => {
                    req.abort()

                    if (!this.streamEnabled) {
                        reject(new Error('Timeout reached'))
                    }
                })
            }

            req.on('error', (err) => {
                reject(err)
            })

            if (this.data) req.write(this.data)

            req.end()
        })
    }
}

const req = async (url,method,data,options)=>{
    options = options || {}
    
        var r = new Client(url, method.toUpperCase())
        if(data){
            var sendAs = options.type || null
            r.body(data , sendAs)
        }
        if(options.headers){
            r.reqHeaders = options.headers
        }
        return r.send().then((res) => {
            if(res && res.headers){
                var contentType = res.headers['content-type']
                if(contentType && contentType.indexOf('json') > -1){
                    return Promise.resolve(res.json())
                }else{
                    return Promise.resolve(res.text())
                }
            }
            return Promise.resolve(null)
        })
   
}

req.get =async (url,data,options)=>{
    return req(url,'GET',data,options)
}
req.post = (url,data,options)=>{
    return req(url,'POST',data,options)
}
req.put = (url,data,options)=>{
    return req(url,'PUT',data,options)
}
req.delete = (url,data,options) =>{
    return req(url,'DELETE',data,options)
}

//export default req
module.exports = req