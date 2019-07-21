const accessToken = ''
const rp = require('request-promise')
const logger = require('@greenrenge/logger')('test')
const getFbGraph = require('./index')
const exec = getFbGraph({
  request: rp,
  logger
})
const postFields = [
  //   {
  //   type: 'text',
  //   name: 'message'
  // },
  {
    type: 'function',
    name: 'message',
    function: msg => {
      return `commented : ${msg}`
    }
  },
  // {
  //   type: 'text',
  //   name: 'id'
  // },
  {
    type: 'custom',
    name: 'summary',
    function: ({ message, id, created_time }) => {
      return `${id} : ${message} on ${created_time}`
    }
  },
  {
    type: 'date',
    name: 'created_time'
  }
]
async function main() {
  const feed = await exec({
    query: 'fields=id,message,created_time,comments.limit(1)',
    format: {
      //fields: postFields,
      //any:false,
      children: [{
        fields: postFields,
        any: false,
        node: 'comments',
        paging: true
      }],
      paging: true
    }
  })({
    accessToken,
    node: '156146161652',
    edge: 'feed'
  })
  // first page
  console.log(feed.length)
  console.log(JSON.stringify(feed[0]))
  // all first feed posts
  //console.log(JSON.stringify((await Promise.all([...feed]))))
  // let n = 0
  // for await (const post of feed) {
  //   n++
  //   console.log(`post ${n} : ${post.id}`)
  // }
  // console.log(feed.length)
}
main()
