# PyNCMd - Vercel 云函数
![Screencap](https://user-images.githubusercontent.com/31397301/181492452-7d703fca-47a9-4a56-8659-0906aa1ec88c.png)

## API 服务设置
### 初始化
- Fork 此项目
- 在 Vercel 导入项目
### 配置网易云账号
- 进入 `[Vercel 提供的域名]/api/pyncm?module=identity&phone=[你的手机号]&pwd=[你的明文密码]`
- (可选）使用不同国家代码可加入参数 `...&ctcode=[国家代码]`
- 响应报文应形式如下 `{"code": 200, "message": "14802a8dcecd7b925b20a546d635e059d28...`,复制 `message` 的值
- 在 Vercel 项目配置新建环境变量 `PYNCMD_SESSION`, 填入该值
- 回到你的实例页面，在`Deployments`选择最新实例，进行`Redeploy`
- 重新进入第一步的 URL 将会有以下输出: [503 Non-empty session](https://github.com/mos9527/pyncmd#%E9%94%99%E8%AF%AF%E4%BF%A1%E6%81%AF-faq)

至此 API 配置介绍部分完毕。通过 `[Vercel 提供的域名]` 即可访问你的 `pyncmd` 实例

## API 使用指南
作为 [pyncm](https://github.com/mos9527/pyncm) 的 SCF 前端，本 API 采用相似的语法
### 使用例
[网页端 - 获取歌曲音频文件](https://github.com/mos9527/pyncm/wiki/05---%E6%AD%8C%E6%9B%B2#pyncmapistrackgettrackaudiosong_ids-list-bitrate320000) - `pyncm.apis.track.GetTrackAudio(song_ids, bitrate)`

    PC 端- 获取歌曲音频详情（文件URL、MD5…）
    Parameters

      song_ids (list) – 歌曲 ID
  
      bitrate (int*, *optional) – 比特率 (96k SQ 320k HQ 320k+ Lossless/SQ). Defaults to 320000  

请求 URL 即 `[...]?modlue=track&method=GetTrackAudio&song_ids=[歌曲 ID]&bitrate=[Bitrate]`
### 其他参数
### `withIP`
该参数可指定汇报网易云音乐服务器的客户端 IP，可解决某些情况下歌曲无法播放的问题
- `...&withIP=client` 使用向 PyNCMd 发起请求者的 IP
- `...&withIP=server` 使用 Vercel 的服务器 IP
- `...&withIP=1.1.1.1` 自定义 IP

### 返回值
- 网易云侧正常，请求报文即网易云侧响应内容
- `pyncmd` 或其依赖异常，特殊响应码的错误汇报将成为响应内容
### 错误信息 FAQ
- HTTP 503 `Session environ \"session\" non-empty`
配置新账号时，旧账号的`PYNCMD_SESSION`应被清空
- ...
# 附 - Vercel Pricing
![as of 062422](https://user-images.githubusercontent.com/31397301/175424049-c21c18aa-6a6c-4bf1-b46e-5fbda50731c1.png)
