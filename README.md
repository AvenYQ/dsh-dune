# dsh-finch

独立的 Finch 风格皮肤。默认界面字体采用 Helvetica Neue 和系统中文字体，与本机 Finch 当前的字体设置一致；Outfit 字体仍随插件打包，供后续比较。颜色使用 DSH 主题 token，支持亮色和暗色。

## 使用

Finch 与 Quiet 是两个独立皮肤，应一次启用一个。独立的 dsh-reveal 插件负责流式文字效果。可让 AI 使用 `dsh_select_skin` 在两个皮肤之间切换；该工具先停用另一皮肤，再启用目标皮肤。也可通过插件管理器手动操作，先关当前皮肤再开另一个。

## AI 设计主题

让 AI 按描述创建或调整主题，调用 `dsh_finch_design_theme`。工具保存主题名称和颜色槽到 DSH 设置；每个颜色槽需要提供 light 和 dark 十六进制颜色。未指定的槽沿用默认值。设置发生变化时，客户端刷新当前配色。传 `reset=true` 恢复默认配色。

可用颜色槽：`bgBase`、`bgLayer1`、`bgLayer2`、`bgLayer3`、`bgOverlay`、`sidebar`、`textPrimary`、`textSecondary`、`textTertiary`、`textCaption`、`border1`、`border2`、`border3`、`border4`、`hover`、`accent`、`error`、`warning`、`success`、`idle`。

## 工作区图标

在侧栏把鼠标移到工作区行上，点右侧的 **`…`**，菜单里在「重命名」和「删除工作区」之间多出一条 **「图标 ›」**；指向它，右侧展开第二层面板——上面一排颜色（含"跟随主题"），下面 51 个 Phosphor 图标（MIT 许可）：21 个常用 + 30 个有趣，中间有分隔线，底部"恢复默认"。图标和颜色自由组合，选中即保存，无需重启。

配置保存在 DSH 设置里（`workspaceIcons`），按工作区 ID 记录，因此重命名工作区不会丢失。文件夹类图标在展开时会自动切换为打开态，其他图标保持不变。

也可以让 AI 代劳：工具 `dsh_finch_set_workspace_icon` 接受工作区名称、路径或 ID，配 `icon` 与 `color`；`reset=true` 清除该工作区的自定义外观。例如说“把「知识库」换成蓝色的地球图标”。

## 维护

字体、排版及默认色位于 `lib/client.js`；工具和可持久化配置位于 `lib/index.js`。Outfit 字体采用 SIL OFL，许可见 `fonts/OFL.txt`。
