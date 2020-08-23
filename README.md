# pyncmd
[PyNCM](https://github.com/greats3an/pyncm) 的Web前端
本项目旨在共享 CVIP 账户的音乐特权，为自建解析接口提供方案

# 注意
下载所调用的eapi实为网易云web端播放用api，故下载不会计入VIP下载额度

# 使用

	pyncmd.py --phone [手机号] --password [密码] --message [附加信息] --port [端口号]

# 工程进度
|功能|进度|
|-|-|
|歌曲解析与播放|✔|
|歌单解析与播放|✔|
|专辑解析与播放|✔|
|FFT 可视化|✔|
|播放列表|✔|
|歌曲下载|✔|
|多语言歌词下载|✔|
|MV 播放 / 下载|✔|
|保存登录信息|✔|
# DEMO
使用:
[PyNCMd](https://mos9527.tooo.top/ncm/) *使用 '..../ncm/?[链接]' URL参数自动填入*

# 截图
![image](https://raw.githubusercontent.com/greats3an/pyncmd/master/screenshot/shot1.gif)

# 依赖包

    requests,pycryptodome,colorama,mutagen

## 依赖安装

    pip install -r requirements.txt

# 感谢

[The Bootstrap Team](https://getbootstrap.com/)

[BootCSS](https://bootcss.com)

And you✨