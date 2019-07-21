const cloneDeep = require('lodash/cloneDeep')
const logger = require('@greenrenge/logger')('fb-graphql.type-converter')
/**
 *
 * @param {string} type one of these val date,int,float,text,boolean
 * @param {string} rawData string *** to be convert
 */

module.exports.convertToType = (type, rawData) => {
    switch (type) {
        case 'date': return new Date(rawData)
        case 'int': return parseInt(rawData)
        case 'float': return parseFloat(rawData)
        case 'text': return rawData
        case 'boolean': return rawData === 'true' ? true : rawData === 'false' ? false : undefined
        case 'object': return cloneDeep(rawData) // if this is used when it it actually array--> beware of facebook's bug that gives us null object in their array
        default: {
            logger.error(`the type specified is not matched ${type}, undefined is returned`)
            return undefined
        }
    }
}