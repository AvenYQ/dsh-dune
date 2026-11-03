import z from "@deepseek-ai/schemastery";
import { defineTool } from "@deepseek-ai/dsh-tools";

export const name = "dsh-clay";
export const inject = ["tools", "settings"];
export const Config = z.object({
  customTheme: z.string().default("").volatile().description("AI 设计的主题 JSON；留空使用默认配色。"),
  workspaceIcons: z.string().default("").volatile().description("工作区图标映射 JSON：workspaceId → { icon, color }，由侧栏右键面板写入。"),
});

const slots = new Set(["bgBase", "bgLayer1", "bgLayer2", "bgLayer3", "bgOverlay", "sidebar", "textPrimary", "textSecondary", "textTertiary", "textCaption", "border1", "border2", "border3", "border4", "hover", "accent", "error", "warning", "success", "idle", "link"]);
function validate(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("主题必须是 JSON 对象");
  if (typeof input.name !== "string" || !input.name.trim() || input.name.length > 80) throw new Error("主题需要不超过 80 字的名称");
  if (!input.colors || typeof input.colors !== "object" || Array.isArray(input.colors)) throw new Error("主题需要 colors 对象");
  const colors = {};
  for (const [key, value] of Object.entries(input.colors)) {
    if (!slots.has(key)) throw new Error(`未知颜色槽位: ${key}`);
    if (!value || typeof value !== "object" || Array.isArray(value) || ![value.light,value.dark].every(x => typeof x === "string" && /^#(?:[a-f\d]{3}|[a-f\d]{4}|[a-f\d]{6}|[a-f\d]{8})$/i.test(x))) throw new Error(`${key} 必须包含 light 和 dark，均为十六进制颜色`);
    colors[key] = {light:value.light, dark:value.dark};
  }
  if (!Object.keys(colors).length) throw new Error("至少提供一个颜色槽位");
  return {name:input.name.trim(), colors};
}
const ICON_NAMES = ["folder", "folder-simple", "briefcase", "code", "book-open", "palette", "cube", "stack", "terminal", "database", "flask", "rocket", "star", "heart", "camera", "music-notes", "globe", "wrench", "lightbulb", "tree-structure", "pen-nib", "ghost", "cat", "dog", "bird", "butterfly", "fish", "coffee", "pizza", "ice-cream", "cake", "cookie", "popcorn", "beer-stein", "wine", "game-controller", "dice-five", "crown", "magic-wand", "sparkle", "confetti", "balloon", "guitar", "headphones", "plant", "cactus", "flower-lotus", "puzzle-piece", "robot", "alien", "rainbow"]
const HEX = /^#(?:[a-f\d]{3}|[a-f\d]{4}|[a-f\d]{6}|[a-f\d]{8})$/i;

/** 把工作区标识（id、标题或路径）解析成唯一的持久工作区。 */
function resolveWorkspace(ctx, needle) {
  const registry = ctx.get("workspaceRegistry");
  if (!registry || typeof registry.list !== "function") throw new Error("工作区服务不可用");
  const rows = registry.list();
  const text = String(needle || "").trim();
  if (!text) throw new Error("请提供工作区名称或 ID");
  const matches = rows.filter(row =>
    row.id === text ||
    row.title === text ||
    row.path === text ||
    (typeof row.path === "string" && row.path.endsWith("/" + text)));
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) throw new Error(`“${text}”匹配到多个工作区，请改用 ID`);
  const names = rows.map(row => `${row.title}（${row.id}）`).join("、");
  throw new Error(`找不到工作区“${text}”。现有：${names || "无"}`);
}

export function apply(ctx) {
  ctx.tools.register(defineTool({
    name: "dsh_clay_design_theme",
    description: "为 dsh-clay 设计并持久化配色。按用户意图生成名称与颜色槽，每个槽提供 light 和 dark 十六进制颜色；未提供的槽沿用默认值。槽位：bgBase,bgLayer1,bgLayer2,bgLayer3,bgOverlay,sidebar,textPrimary,textSecondary,textTertiary,textCaption,border1,border2,border3,border4,hover,accent,link,error,warning,success,idle。传 reset=true 恢复默认。仅在用户请求更换主题时调用。",
    parameters: {
      themeJson: {type:"string", description:'主题 JSON，例如 {"name":"暖砂","colors":{"accent":{"light":"#a9603e","dark":"#dc9b78"}}}。'},
      reset: {type:"boolean", description:"恢复默认主题。"},
    },
    output: {schema:{type:"object",additionalProperties:false,properties:{message:{type:"string",required:true}}},render:(_args,value)=>[{type:"text",text:value.message}]},
    async execute(args) {
      const row = ctx.settings.describe().find(item => item.ns === "dsh-clay");
      if (!row) throw new Error("dsh-clay 设置尚未注册；请确认插件已启用");
      let customTheme = "";
      if (!args.reset) {
        if (typeof args.themeJson !== "string") throw new Error("请提供 themeJson，或使用 reset=true");
        customTheme = JSON.stringify(validate(JSON.parse(args.themeJson)));
      }
      await ctx.settings.update("dsh-clay", {customTheme}, row.revision);
      return {message: customTheme ? `主题“${JSON.parse(customTheme).name}”已保存；已连接的客户端将刷新配色。` : "已恢复 dsh-clay 默认主题。"};
    },
  }));

  ctx.tools.register(defineTool({
    name: "dsh_clay_set_workspace_icon",
    description: "设置 dsh-clay 侧栏某个工作区前面的图标与颜色。workspace 传工作区名称、路径或 ID；icon 取 " + ICON_NAMES.join(",") + " 之一；color 传十六进制颜色，传空字符串表示跟随主题。reset=true 清除该工作区的自定义图标。仅在用户要求修改某工作区图标时调用。",
    parameters: {
      workspace: {type:"string", description:"工作区名称、路径或 ID。"},
      icon: {type:"string", description:"图标名；留空保持原图标。"},
      color: {type:"string", description:"十六进制颜色；留空字符串表示跟随主题。"},
      reset: {type:"boolean", description:"清除该工作区的自定义图标与颜色。"},
    },
    output: {schema:{type:"object",additionalProperties:false,properties:{message:{type:"string",required:true}}},render:(_args,value)=>[{type:"text",text:value.message}]},
    async execute(args) {
      const row = ctx.settings.describe().find(item => item.ns === "dsh-clay");
      if (!row) throw new Error("dsh-clay 设置尚未注册；请确认插件已启用");
      const workspace = resolveWorkspace(ctx, args.workspace);
      let map = {};
      try { map = JSON.parse(row.value?.workspaceIcons || "{}") || {}; } catch (error) { map = {}; }
      const next = { ...map };
      if (args.reset) delete next[workspace.id];
      else {
        const current = next[workspace.id] || {};
        const icon = typeof args.icon === "string" && args.icon.trim() ? args.icon.trim() : current.icon;
        const color = args.color === undefined ? current.color : String(args.color).trim();
        if (icon !== undefined && !ICON_NAMES.includes(icon)) throw new Error(`不支持的图标：${icon}`);
        if (color && !HEX.test(color)) throw new Error(`颜色需要是十六进制：${color}`);
        const spec = {};
        if (icon) spec.icon = icon;
        if (color) spec.color = color;
        if (Object.keys(spec).length === 0) delete next[workspace.id];
        else next[workspace.id] = spec;
      }
      await ctx.settings.update("dsh-clay", {workspaceIcons: JSON.stringify(next)}, row.revision);
      return {message: args.reset ? `已恢复“${workspace.title}”的默认图标。` : `“${workspace.title}”的图标已更新。`};
    },
  }));
}
