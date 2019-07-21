const { cloneDeep } = require('lodash')

// it needs Page Access Token --> it can get insights.metric(post_impressions_organic,post_impressions_organic_unique,post_video_views_organic){name,period,values}

// "place": {
//   "name": "สวรรค์",
//   "location": {
//     "city": "Singapore",
//     "country": "Singapore",
//     "latitude": 1.29306,
//     "longitude": 103.856
//   },
//   "id": "410290795847631"
// },

// "message_tags": [
//   {
//     "id": "1000131826670468",
//     "name": "Sorasak Srirussamee",
//     "type": "user",
//     "offset": 27,
//     "length": 19
//   },
//   {
//     "id": "462811480428178",
//     "name": "Jaturamitr Project Case",
//     "type": "page",
//     "offset": 47,
//     "length": 23
//   }
// ]

// "comments": {
//   "data": [
//       {
//           "from": {
//               "id": "195255480546434",
//               "name": "My Ideology"
//           },
//           "message": "hghg",
//           "comment_count": 1,
//           "can_remove": true,
//           "created_time": "2018-06-27T12:18:51+0000",
//           "like_count": 1,
//           "user_likes": true,
//           "can_comment": true,
//           "comments": {
//               "data": [
//                   {
//                       "from": {
//                           "id": "195255480546434",
//                           "name": "My Ideology"
//                       },
//                       "message": "hkj",
//                       "can_remove": true,
//                       "created_time": "2018-06-27T12:18:56+0000",
//                       "like_count": 0,
//                       "user_likes": false,
//                       "can_comment": false,
//                       "id": "2015976695140961_2016057371799560"
//                   }
//               ],
//               "paging": {
//                   "cursors": {
//                       "before": "QVFIUndBR0VJRTVhNzRicDVqUjNmVkRyaFNMUFI2czB4SjZANOUVWOUJmWU9mMXBTX1dQWHNqQVIzWHF4WjVPc3o0UDhBUmNaRHV0cGxrXzhNSE5zcVRzaVhn",
//                       "after": "QVFIUndBR0VJRTVhNzRicDVqUjNmVkRyaFNMUFI2czB4SjZANOUVWOUJmWU9mMXBTX1dQWHNqQVIzWHF4WjVPc3o0UDhBUmNaRHV0cGxrXzhNSE5zcVRzaVhn"
//                   }
//               },
//               "summary": {
//                   "order": "chronological",
//                   "total_count": 1,
//                   "can_comment": true
//               }
//           },
//           "id": "2015976695140961_2016056405132990"
//       }
//   ]

/**
 *
  id,
  from
  {
    id,
    name,
    fan_count
  },
  attachments
  {
    description,
    media,
    target,
    title,
    type,
    url
  },
  description,
  message,
  caption,
  comments.limit(200).summary(true).filter(toplevel)
  {
    attachment,
    from
    {
      id,
      name
    },
    message,
    comment_count,
    can_remove,
    created_time,
    like_count,
    user_likes,
    can_comment,
    comments.limit(1).summary(true).filter(toplevel)
    {
      from
      {
        id,
        name
      },
      message,
      can_remove,
      created_time,
      like_count,
      user_likes,
      can_comment
    }
  }
  ,likes.limit(1).summary(true)
  ,shares
  ,object_id
  ,status_type
  ,type
  ,actions
  ,icon
  ,link
  ,picture
  ,created_time
  ,updated_time
  ,place
  {
    id,
    name,
    location
    {
      city,
      country,
      latitude,
      longitude,
      country_code
    }
  },
  message_tags,
  to
  {
    id,
    name
  },
  full_picture,
  insights.period(lifetime).metric(post_impressions_organic,post_impressions_organic_unique,post_video_views_organic)
  {
    name,
    period,
    values
  }
 */

/** THIS IS SINGLETON OBJECT IN PROCESS , MAKE SURE THIS OBJECT MUST NOT BE MUTATED */

const { text, int, date, float, boolean, object, textAll, dateAll, intAll, floatAll, objectAll, booleanAll } = require('../helpers/type-mapper')

const baseConfig = {
    query: 'fields=id,from{id,name,fan_count},attachments{description,media,target,title,type,url},description,message,caption,comments.limit(200).summary(true).filter(toplevel){attachment,from{id,name},message,comment_count,can_remove,created_time,like_count,user_likes,can_comment,comments.limit(1).summary(true).filter(toplevel){from{id,name},message,can_remove,created_time,like_count,user_likes,can_comment}},likes.limit(1).summary(true),shares,object_id,status_type,type,actions,icon,link,picture,created_time,updated_time,place{id,name,location{city,country,latitude,longitude,country_code}},message_tags,to{id,name},full_picture',
    // accessToken: '',
    version: 'v3.0',
    // node: '',
    format: {
        fields: [
            ...textAll('id', 'description', 'message', 'caption', 'object_id', 'status_type', 'type', 'icon', 'link', 'full_picture', 'picture'),
            ...dateAll('created_time', 'updated_time'),
            ...objectAll('from', 'to', 'place', 'message_tags', 'shares'),
            {
                name: 'actions',
                type: 'array',
                nested: {
                    fields: textAll('name', 'link')
                }
            }
        ],
        children:
            [
                {
                    node: 'attachments',
                    fields: [
                        ...textAll('description', 'title', 'url', 'type'),
                        ...objectAll('target', 'media', 'subattachments')
                    ]
                },
                {
                    node: 'comments',
                    paging: false, // disable for paging
                    fields: [
                        ...objectAll('from'),
                        text('message'),
                        ...booleanAll('can_remove', 'can_comment'),
                        date('created_time'),
                        ...intAll('user_likes', 'comment_count', 'like_count')
                    ],
                    children: [
                        {
                            node: 'attachments',
                            fields: [
                                ...textAll('description', 'title', 'url', 'type'),
                                ...objectAll('target', 'media')
                            ]
                        },
                        {
                            node: 'comments',
                            paging: false, // disable for paging
                            fields: [
                                ...objectAll('from'),
                                text('message'),
                                ...booleanAll('can_remove', 'can_comment'),
                                date('created_time'),
                                ...intAll('user_likes', 'like_count')
                            ]
                        }
                    ]
                },
                {
                    node: 'likes',
                    fields: textAll('id', 'name'),
                    paging: false
                }
            ]
    }
}
/**
       * this is extract summary field that is on the same level as data/paging in facebook graph return
       * our helper doesnt support it yet, we need to extract them as custom field
       * @param {object} config
       */
const addCustomFields = (config) => {
    const newConfig = cloneDeep(config)
    newConfig.format.fields.push(
        {
            // special fields that extract the summary from children
            name: 'comments_summary',
            type: 'custom',
            function: (data) => {
                return data ? (data.comments ? data.comments.summary : {}) : {}
            }
        })
    newConfig.format.fields.push(
        {
            // special fields that extract the summary from children
            name: 'likes_summary',
            type: 'custom',
            function: (data) => {
                return data ? (data.likes ? data.likes.summary : {}) : {}
            }
        })
    return newConfig
}

/**
 * Own page can get insights in the post (need page token and the right permission)
 * @param {object} pagePost
 */
function getPagePostOwn(pagePost) {
    const pagePostOwn = addCustomFields(pagePost)// get new object
    pagePostOwn.query += ',insights.period(lifetime).metric(post_impressions_organic,post_impressions_organic_unique,post_video_views_organic,post_clicks_by_type){name,period,values}'
    pagePostOwn.format.children.push(
        {
            node: 'insights',
            fields: [
                ...textAll('name', 'period', 'id'),
                {
                    name: 'values',
                    type: 'array',
                    nested: {
                        fields: [int('value')]
                    }
                }
            ],
            paging: false
        }
    )
    return pagePostOwn
}

module.exports = {
    pagePostOwn: getPagePostOwn(baseConfig),
    pagePost: addCustomFields(baseConfig)
}
