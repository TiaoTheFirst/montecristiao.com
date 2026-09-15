# 蒙特克里斯条府

正式站：府邸参观、日常、游戏、邮箱名片与私人通信。作者通过 /correspondence-admin 阅读已递交来信、保存并确认发布回信。来访反馈与府主处理案已开放；个人札记和沙龙仍关闭。反馈独立开关 FEEDBACK_OPEN。

Cloudflare Worker montecristiao-com；main 自动发布。npm ci && npm run build。服务端只在正式域名、数据库、邮件及认证密钥齐备且 ACCOUNTS_OPEN=true 时开放账号。OWNER_EMAIL、BETTER_AUTH_SECRET、RESEND_API_KEY 仅存于 Worker 密钥。不要将私有数据或密钥放入仓库。

紧急关闭：将 ACCOUNTS_OPEN 设为 false 后部署，保留 D1 和密钥。不要回滚或删除数据库。每日 Cron 只清理到期凭证，不生成内容、不自动回信。恢复私有数据库需按运营仓库的恢复说明，先关闭通信并核对删除记录。
