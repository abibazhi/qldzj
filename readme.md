# 备忘
```
这个应该是验证github的第三方认证登录功能
```

# 模块化
```
已经把oauth模块单独拿出来了。
app.js是原始版本，app1.js是模块化后的版本
```

## 逻辑
0. https://daxumi.cn，会被nginx转发到3000
0. 根路径指向就是home主页
0. home主页中有登录链接，指向github
0. 认证过后，重新跳回到主页

# 运行
```
node app1.js #这个会加载登录模块和主页模块
```

# 用户信息
```
{
  id: '36220843',
  displayName: null,
  username: 'abibazhi',
  profileUrl: 'https://github.com/abibazhi',
  photos: [ { value: 'https://avatars.githubusercontent.com/u/36220843?v=4' } ],
  provider: 'github',
  _raw: '{"login":"abibazhi","id":36220843,"node_id":"MDQ6VXNlcjM2MjIwODQz","avatar_url":"https://avatars.githubusercontent.com/u/36220843?v=4","gravatar_id":"","url":"https://api.github.com/users/abibazhi","html_url":"https://github.com/abibazhi","followers_url":"https://api.github.com/users/abibazhi/followers","following_url":"https://api.github.com/users/abibazhi/following{/other_user}","gists_url":"https://api.github.com/users/abibazhi/gists{/gist_id}","starred_url":"https://api.github.com/users/abibazhi/starred{/owner}{/repo}","subscriptions_url":"https://api.github.com/users/abibazhi/subscriptions","organizations_url":"https://api.github.com/users/abibazhi/orgs","repos_url":"https://api.github.com/users/abibazhi/repos","events_url":"https://api.github.com/users/abibazhi/events{/privacy}","received_events_url":"https://api.github.com/users/abibazhi/received_events","type":"User","user_view_type":"public","site_admin":false,"name":null,"company":null,"blog":"","location":null,"email":null,"hireable":null,"bio":null,"twitter_username":null,"notification_email":null,"public_repos":74,"public_gists":0,"followers":0,"following":0,"created_at":"2018-02-07T06:18:06Z","updated_at":"2025-01-28T08:47:40Z"}',
  _json: {
    login: 'abibazhi',
    id: 36220843,
    node_id: 'MDQ6VXNlcjM2MjIwODQz',
    avatar_url: 'https://avatars.githubusercontent.com/u/36220843?v=4',
    gravatar_id: '',
    url: 'https://api.github.com/users/abibazhi',
    html_url: 'https://github.com/abibazhi',
    followers_url: 'https://api.github.com/users/abibazhi/followers',
    following_url: 'https://api.github.com/users/abibazhi/following{/other_user}',
    gists_url: 'https://api.github.com/users/abibazhi/gists{/gist_id}',
    starred_url: 'https://api.github.com/users/abibazhi/starred{/owner}{/repo}',
    subscriptions_url: 'https://api.github.com/users/abibazhi/subscriptions',
    organizations_url: 'https://api.github.com/users/abibazhi/orgs',
    repos_url: 'https://api.github.com/users/abibazhi/repos',
    events_url: 'https://api.github.com/users/abibazhi/events{/privacy}',
    received_events_url: 'https://api.github.com/users/abibazhi/received_events',
    type: 'User',
    user_view_type: 'public',
    site_admin: false,
    name: null,
    company: null,
    blog: '',
    location: null,
    email: null,
    hireable: null,
    bio: null,
    twitter_username: null,
    notification_email: null,
    public_repos: 74,
    public_gists: 0,
    followers: 0,
    following: 0,
    created_at: '2018-02-07T06:18:06Z',
    updated_at: '2025-01-28T08:47:40Z'
  }
}
```
