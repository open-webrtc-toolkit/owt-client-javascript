# 部署说明
## 部署

1. 安装Apache，版本不限，（如果已安装，可跳过此步骤）
2. 将product文件夹copy到Apache的目录下（Linux：/var/www/html； Windows：$Apache$/webapp/）
3. 修改product中的文件

  a. product/js/index.js

    - securedServerAddress、unsecuredServerAddress、nodeAddress修改为所需要的服务器的地址。注：地址的格式最好为URL

  b. product/config.json

    - rooms下的key属性，值改为需要连接到的服务器上存在的serverId（通过 http://{serverURL}:3000/console 中获取）
    - 如果需要添加多个房间，请在数组中添加如下格式的json数据：
```
{
  “id”: “value”,
  “key”: “serverId”,
  “title”: “Room TItle”
}
```

## 使用

1. 启动Apache
2. 访问：http://{serverURL}/product?room={roomId}
3. 在文本框中输入连接后显示的名字
4. 如需更改视频/音频设置，请点击文本框左下方的 ”Setting” 进行设置
5. 如需更改连接进入房间后，视频显示模式，请通过右下方的下拉框进行选择
6. 如果登陆的浏览器与服务器不在同一个网络环境，即服务器在外网环境，登陆的浏览器在内网环境且需要代理，请勾选ICE选项
7. 点击”Login”，进入房间