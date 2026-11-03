# dsh-dune

给 DeepSeek Harness 的暖色皮肤：米纸般的表面、克制的字号与字重、轻微回弹的侧栏动效，外加一套可自定义的工作区图标。

配色不是写死的——内置五套方案，也可以用一句话让 AI 生成一套新的。

## 使用

与 `dsh-quiet` 是两个独立皮肤，同一时间只启用一个。流式文字的浮现效果由独立的 `dsh-reveal` 插件负责，两者互不依赖。

可以让 AI 用 `dsh_select_skin` 在 `dune` 与 `quiet` 之间切换（先停用另一个再启用目标）。也可以在插件管理器里手动操作：先关掉当前皮肤，再打开另一个。

## 外观设置

设置 → **Dune** 里有三块内容：

- **当前方案**：显示正在用的配色和色板，可一键恢复默认。
- **预设方案**：原色、暖砂陶土、苔原、海盐、暮紫、琥珀、在路上，点一下立即生效，不用重启。
- **让 AI 设计**：写一句想要的气氛（例如「雨后的灰绿，配一点旧铜色」），复制指令发给对话里的 AI，它会调用 `dsh_dune_design_theme` 生成并存下来。

明暗跟随「通用」里的主题设置。强调色会派生气泡、发送按钮、链接、引用 chip、侧栏选中态、「深度求索中」那一行的颜色，所以换任何一套配色，界面各处都会一起变。

### AI 直接调用

工具 `dsh_dune_design_theme` 接受一段 JSON：

```json
{"name":"暖砂陶土","colors":{"accent":{"light":"#A9603E","dark":"#D18C66"}}}
```

每个槽给 `light` 与 `dark` 两个十六进制颜色，未提供的槽沿用默认值；`reset=true` 恢复默认。

可用槽位：`bgBase`、`bgLayer1`、`bgLayer2`、`bgLayer3`、`bgOverlay`、`sidebar`、`textPrimary`、`textSecondary`、`textTertiary`、`textCaption`、`border1`、`border2`、`border3`、`border4`、`hover`、`accent`、`link`、`error`、`warning`、`success`、`idle`。

`link` 用来单独指定链接色（不给就跟随 `accent`）；`warning` 可以用来承载一个第三色，比如「在路上」里那条路牌的芥末黄。

## 工作区图标

把鼠标移到侧栏的工作区行上，点右侧的 **`…`**，菜单里在「重命名」和「删除工作区」之间多出一条 **「图标 ›」**。指向它，右侧展开第二层面板：上面一排颜色（含「跟随主题」），下面 51 个 Phosphor 图标（21 个常用 + 30 个有趣），底部「恢复默认」。

选中即保存，按工作区 ID 记录，重命名工作区不会丢。文件夹类图标在行展开时会切换成打开态。

也可以交给 AI：`dsh_dune_set_workspace_icon` 接受工作区名称、路径或 ID，配 `icon` 与 `color`，`reset=true` 清除。

## 维护

- `lib/client.js`：配色、字体、侧栏动效、图标面板与设置页。
- `lib/index.js`：可持久化配置与两个 AI 工具。
- `fonts/`：Outfit 字体，SIL OFL 许可，见 `fonts/OFL.txt`。

图标来自 [Phosphor Icons](https://phosphoricons.com/)（MIT）。字体为 Outfit（SIL OFL）。本项目以 MIT 许可发布。
