# PyNCMd - SCF / 云函数 API Ver.
使用腾讯云 API GW 及 SCF 搭建本服务
# API 服务设置
## 准备函数zip包
- 使用预备版本：  
  - 移步 [Releases](https://github.com/greats3an/pyncmd/releases)，下载 `pyncmd.zip`
- 或可自行准备：
  - 下载本项目 ： **Code** > **Download ZIP** 
  - 解压后运行 `make.py`，保存产生于其目录的 `pyncmd.zip`  

## 配置腾讯云
### 基础配置
- 进入 [Serverless - 函数服务 - 从头开始](https://console.cloud.tencent.com/scf/list-create?&createType=empty)
- 选择 **事件函数**,在 **函数代码** 处上传所准备的 `pyncmd.zip`，就绪后 **完成** > **跳转**
- 在 **触发管理** - **创建触发器** 中：
  - 触发版本 : **$LATESET**
  - 触发方式 : **API 网关触发**
  - 请求方法 ：**GET**
  - 集成响应 ：**不启用**
- 点击 **API 服务名**，进入相应配置页面 - **编辑** - **启用 CORS** - **启用**
- 回到之前的页面，找到 **API网关触发** - **访问路径**
  - 形式如 `https://service-########-#########.##.apigw.tencentcs.com/release/pyncmd`（ 后文将以 `[...]` 代替  ）
  - 浏览器中打开 `[...]/track/GetTrackDetail?song_ids=17455854`，应有形式如下的报文
  
  `{"songs": [{"name": "Harder, Better, Faster, Stronger", "id": 17455854, "pst": 0, "t": 0, "ar": [{"id": 90513, "name": "Daft Punk", "tns": [], "alias": []}], "alia": ["\u7535\u5f71\u300a\u661f\u96455555\uff1a\...`

至此 API 基础配置完毕；下面将介绍如何登陆个人账号以共享 CVIP 特权（可选）
### 登录态配置
*注：账号本身需相应特权才能获取相应资源*

- （建议无痕模式操作) 浏览器中打开 `[...]/identity?phone=[你的手机号]&pwd=[你的明文密码]`
  - 响应报文应形式如下
    `{"statusCode": 200, "msg": "14802a8dcecd7b925b20a546d635e059d28...`
  - 复制 `msg` 的值
- 在 **函数管理** - **函数代码** - **文件** - **新建**，创建文件 `session` (与 `index.py` 同目录）
- 将 `msg` 的内容粘贴至 `session` 文件内并保存，然后 **部署**
- 浏览器中打开 `[...]/track/GetTrackAudio?song_ids=26349641`（歌曲需 CVIP），应有形式如下的报文

  `{"data": [{"id": 26349641, "url": "http://m701.music.126.net/20220122164837/9a8b7d288ef130d89ea5aff4d52e0e4b/jdymusic/obj/wo...`
  
至此 API 配置介绍部分完毕

## 配置 Github Pages
- Fork 此项目
- 在自己的 `docs/config.js` 中，修改 `endpoint`，如下：

        let endpoint = "https://service-**************.**.apigw.tencentcs.com/release/pyncmd/"

- 保存后，稍后访问 `https://[你的 Github 用户名].github.io/pyncmd/` 即可
![scrnshot](https://user-images.githubusercontent.com/31397301/150633232-14760ab9-7403-4d02-948b-c039132c82bb.gif)

## API 使用指南
作为 [pyncm](https://github.com/mos9527/pyncm) 的 SCF 前端，本 API 采用相似的语法
### 使用例
[网页端 - 获取歌曲音频文件](https://github.com/mos9527/pyncm/wiki/05---%E6%AD%8C%E6%9B%B2#pyncmapistrackgettrackaudiosong_ids-list-bitrate320000) - `pyncm.apis.track.GetTrackAudio(song_ids, bitrate)`

    PC 端- 获取歌曲音频详情（文件URL、MD5…）
    Parameters

      song_ids (list) – 歌曲 ID
  
      bitrate (int*, *optional) – 比特率 (96k SQ 320k HQ 320k+ Lossless/SQ). Defaults to 320000  

请求 URL 即 `[...]/track/GetTrackAudio?song_ids=[歌曲 ID]&bitrate=[Bitrate]`
