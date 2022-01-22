# PyNCMd - SCF / 云函数 API Ver.
使用腾讯云 API GW 及 SCF 低成本 / 无成本搭建本服务
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
- 将内容粘贴至 `session` 文件内并保存，然后 **部署**
- 浏览器中打开 `[...]/track/GetTrackAudio?song_ids=26349641`（歌曲需 CVIP），应有形式如下的报文

  `{"data": [{"id": 26349641, "url": "http://m701.music.126.net/20220122164837/9a8b7d288ef130d89ea5aff4d52e0e4b/jdymusic/obj/wo...`
  
至此 API 配置介绍部分完毕

## 配置 Github Pages
- Fork 此项目
- 在自己的 `docs/config.js` 中，修改 `endpoint`，如下：

        let endpoint = "https://service-ghlrryee-1308098780.gz.apigw.tencentcs.com/release/pyncmd/"
        // endpoint should be backslashed (e.g. ...pyncmd/)
        // i forgot to remove it, i know.

- 保存后，稍后访问 `https://[你的 Github 用户名].github.io/pyncmd/` 即可
![scrnshot](https://user-images.githubusercontent.com/31397301/150633232-14760ab9-7403-4d02-948b-c039132c82bb.gif)

## 附：定价
*来自 [产品概述](https://cloud.tencent.com/document/product/583/9199)*
### 免费额度

自2021年11月01日起，所有开通使用云函数 SCF 服务的用户，每月可享受一定量的免费调用次数、免费资源使用量和外网出流量。免费额度如下表：
<table>
  <tr>
    <th class="align-left">发放时间</th>
    <th class="align-left">计费项</th>
    <th class="align-left">免费额度</th>
  </tr>
  <tr>
    <td rowspan="3">前三个月（包含开通当月）每月</td>
    <td>调用次数</td>
    <td>100万次（事件函数和 Web 函数各100万次）</td>
  </tr>
  <tr>
    <td>资源使用量</td>
    <td>40万GBs</td>
  </tr>
  <tr>
    <td>外网出流量</td>
    <td>1GB</td>
  </tr>
  <tr>
    <td rowspan="3">开通三个月后每月</td>
    <td>调用次数</td>
    <td>10万次（事件函数和 Web 函数各5万次）</td>
  </tr>
  <tr>
    <td>资源使用量</td>
    <td>2万GBs</td>
  </tr>
  <tr>
    <td>外网出流量</td>
    <td>0.5 GB</td>
  </tr>
</table>

### 超值1元资源包
#### 规格说明 
超值1元资源包活动详情见 [Serverless 预付费资源包优惠大促销](https://cloud.tencent.com/act/pro/scf_pkg?from=15457)。

<table>
<thead>
<tr>
<th><strong>规格</strong></th>
<th><strong>有效期</strong></th>
<th>资源包定价</th>
<th>按量计费定价</th>
</tr>
</thead>
<tbody><tr>
<td><li>资源使用量： 50万GBs<br></li><li>函数调用次数：100万次（包括事件函数调用次数100万次和 Web 函数调用次数100万次） <br></li><li>外网出流量：2GB</li></td>
<td>1个月</td>
<td><strong>1元</strong></td>
<td>59.8元</td>
</tr>
</tbody></table>



#### 规则说明

- **活动时间**：本活动自2021年10月13日起，长期有效。
- **购买资格**：腾讯云官网已注册且完成实名认证的国内站用户均可参与（协作者与子用户账号除外）。
- **购买限制**：每个 APPID 每月只能购买一个，次月恢复购买资格。
- **资源包有效期**：资源包有效时间自下单之日开始，到有效期结束时停止，停止后资源包额度自动失效。
