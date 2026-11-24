# 教程章节大纲

本大纲尚未最终确定，章节顺序和覆盖范围会随实际写作情况调整。写作时不需完全依照，仅供参考。

示例优先在同一主题内延续，方便后续篇章在已有代码上继续制作。

第 1 至 6 篇已经完成；第 7 篇事件、交互与游戏刻是下一篇的起点。后续篇章可以按实际篇幅合并或拆分，但保持这里的内容依赖顺序。

## 第 1 篇：环境配置（已完成）

- 安装 JDK 25 和 IntelliJ IDEA。
- 使用 Mod Generator 生成 Minecraft 26.1 工程。
- 在 IDEA 中同步 Gradle 并运行 `runClient`。
- 通过模组列表和测试世界确认开发环境可用。

示例：教学工程 `tutorialmod`。

对应官方文档：`gettingstarted/index.md`、`gettingstarted/modfiles.md`、`gettingstarted/structuring.md`

## 第 2 篇：制作第一个物品（已完成）

- 整理模组入口类，认识 `@Mod` 和模组事件总线。
- 使用 `DeferredRegister.Items` 注册普通物品。
- 把物品加入创造模式标签页。
- 使用 `Identifier` 理解注册名、命名空间和资源路径。
- 补齐名称、客户端物品定义、模型和贴图。
- 在前一篇已经完成的工程上，得到游戏内可显示、可获得的第一件物品。

示例：示例物品 `silver`，作为后续银矿石和银制装备的共同材料。

对应官方文档：`items/index.md`、`concepts/registries.md`、`concepts/events.md`、`misc/identifier.md`、`resources/client/models/items.md`、`resources/client/i18n.md`

## 第 3 篇：制作第一个方块（已完成）

- 区分方块实例、世界中的方块状态和物品栏中的方块物品。
- 使用 `DeferredRegister.Blocks` 注册方块，并单独注册对应的 `BlockItem`。
- 设置硬度、爆炸抗性、声音和发光等最常用方块属性。
- 把方块物品加入创造模式标签页。
- 补齐方块状态文件、方块模型、物品模型、贴图和名称。
- 用工具标签设置方块所需的工具类型和等级。
- 得到第一个可放置、可挖掘的示例方块。

示例：示例方块 `silver_ore`，沿用银主题。

对应官方文档：`blocks/index.md`、`blocks/states.md`、`resources/client/models/index.md`、`resources/server/tags.md`

## 第 4 篇：配方与战利品表（已完成）

- 区分 `assets` 中的客户端资源与 `data` 中的服务器数据。
- 用配方定义物品如何获得，用战利品表定义方块和实体掉落什么。
- 用标签统一描述可开采方块、可合成材料或同类内容。

示例：继续使用 `silver_ore` 和 `silver_ingot`，银锭相关配方。

对应官方文档：`resources/index.md`、`resources/server/recipes/index.md`、`resources/server/loottables/index.md`、`resources/server/tags.md`

## 第 5 篇：数据生成基础（已完成）

- 理解 Data 运行配置、`GatherDataEvent` 和数据提供器之间的关系。
- 使用语言提供器生成中英文名称文件。
- 使用配方提供器生成配方及配方书解锁进度。
- 使用方块战利品表提供器生成掉落 JSON。
- 知道标签和模型也可以改用提供器生成。
- 区分重新运行数据生成、数据重载和客户端资源重载。

示例：继续使用 `silver_ore` 和 `silver_ingot`，用数据生成器写出银锭熔炼配方和银矿石掉落。

对应官方文档：`resources/index.md`、`resources/server/recipes/index.md`、`resources/server/loottables/index.md`、`resources/server/tags.md`、`resources/client/models/datagen.md`

## 第 6 篇：工具、盔甲与消耗品（已完成）

- 区分 `Item` 定义与每个 `ItemStack` 携带的数据，认识数据组件。
- 使用工具材料定义挖掘能力、攻击属性和耐久。
- 注册盔甲并配置穿戴、防护和物品模型。
- 使用消耗品组件定义食物、药水效果和食用时间。
- 用物品和方块标签把工具、盔甲与修理材料接入原版分类和等级规则。

示例：以 `silver_ingot` 为材料，分别制作示例工具 `silver_pickaxe`、示例盔甲 `silver_helmet`，并把 `silver_ingot` 自身设为可食用的示例消耗品。

对应官方文档：`items/datacomponents.md`、`items/tools.md`、`items/armor.md`、`items/consumables.md`、`resources/server/tags.md`、`resources/client/models/items.md`

## 第 7 篇：事件、交互与游戏刻

- 区分模组事件总线、游戏事件总线和物理客户端/服务端。
- 区分直接覆盖方块或物品方法与监听交互事件的适用场景。
- 处理右击、放置、破坏和实体交互中的常见需求。
- 使用计划刻、随机刻和客户端动画刻实现延迟或持续更新。
- 保证客户端只负责显示，服务端负责验证和修改世界状态。

示例：制作可右键使用的示例物品 `silver_scepter`，消耗 `silver_ingot`，并在服务端安排一次延迟效果。

对应官方文档：`concepts/events.md`、`concepts/sides.md`、`items/interactions.md`、`blocks/index.md`

## 第 8 篇：实体与实体渲染

- 区分实体类型、实体实例和实体渲染器。
- 注册普通实体，并处理保存、加载和客户端同步。
- 为生物配置属性、目标和行为，或为投射物配置移动与命中。
- 接入实体渲染器和模型、贴图资源。
- 根据需求选择实体数据同步、网络消息或两者组合。

示例：制作投射物实体 `silver_orb`，并让第 7 篇的 `silver_scepter` 改为召唤它。

对应官方文档：`entities/index.md`、`entities/data.md`、`entities/attributes.md`、`entities/livingentity.md`、`entities/renderer.md`

## 第 9 篇：方块状态与方块行为

- 有限状态为什么适合放在方块状态中，无限状态为什么需要方块实体。
- 声明方向、布尔值和整数等方块状态属性。
- 根据放置方向选择状态，并为不同状态配置模型变体。
- 通过自定义 `Block` 子类调整形状、碰撞、放置条件和右键交互。
- 判断一段行为应该写在方块方法、事件监听器还是方块实体中。

示例：制作带 `lit` 状态的示例方块 `silver_lamp`，让 `silver_scepter` 可以切换其状态，并同步改变发光和模型。

对应官方文档：`blocks/index.md`、`blocks/states.md`、`concepts/events.md`

## 第 10 篇：方块实体与持久数据

- 判断何时应当从方块状态升级为方块实体。
- 创建方块实体类型，并让方块正确创建、获取和移除对应实例。
- 使用 Codec 和值读写保存、加载方块实体数据。
- 理解方块实体的 Tick、客户端同步和性能限制。
- 区分方块实体、`SavedData` 和 Data Attachment 各自适合保存什么。

示例：制作示例容器方块 `silver_crate`，先用一个简单计数值演示方块实体数据的保存与加载，暂不添加物品栏和界面。

对应官方文档：`blockentities/index.md`、`datastorage/codecs.md`、`datastorage/valueio.md`、`datastorage/saveddata.md`、`datastorage/attachments.md`

## 第 11 篇：物品处理能力、容器、菜单与界面

- 用物品处理能力让方块实体接收和提供物品。
- 区分容器、菜单和屏幕各自由哪一端负责。
- 建立物品槽，处理点击、快速移动和外部自动化访问。
- 同步菜单数据，并在客户端绘制对应界面。
- 理解服务端权威和物品交易校验，避免两端状态不一致。

示例：继续扩展第 10 篇的 `silver_crate`，加入物品槽、菜单和可打开的界面。

对应官方文档：`inventories/capabilities.md`、`inventories/container.md`、`inventories/menus.md`、`inventories/transactions.md`、`rendering/screens.md`

## 第 12 篇：网络通信与双端同步

- 判断什么时候需要自定义网络消息，什么时候已有同步机制已经足够。
- 注册 Payload，并使用 Stream Codec 描述消息内容。
- 处理客户端请求、服务端验证和服务端回传。
- 避免高频发包、客户端越权修改和不必要的整份状态同步。
- 用一个具体交互把双端消息流串起来。

示例：继续扩展 `silver_crate`，增加一个由客户端请求、服务端执行并回传结果的锁定操作。

对应官方文档：`networking/index.md`、`networking/payload.md`、`networking/streamcodecs.md`、`concepts/sides.md`

## 第 13 篇：特征、生物群系修改与结构生成

- 区分世界生成特征、放置规则和生物群系修改器。
- 让矿石、植被或小型地貌按条件和概率生成。
- 使用结构模板和战利品表加入可探索内容。
- 理解种子、生成阶段与服务端对世界生成的控制。
- 通过定位命令反复检查生成位置和条件。

示例：让第 3 篇的 `silver_ore` 自然生成，并加入使用 `silver_ore` 和 `silver_crate` 的小型结构 `silver_ruin`。

对应官方文档：`worldgen/biomemodifier.md`；其余内容以 26.1 原版世界生成 JSON 和教学工程为准。

## 第 14 篇：流体

- 区分流体类型、流体状态和承载流体的方块。
- 注册静止与流动状态，并处理流动方向和高度。
- 让流体方块参与碰撞、交互和渲染。
- 制作流体桶、流体配方及对应的资源文件。
- 理解流体更新频率和复杂流动逻辑的性能成本。

示例：制作示例流体 `liquid_silver` 及其桶 `liquid_silver_bucket`，并加入与 `silver_ingot` 相关的流体配方。

对应官方文档：`fluids/index.md`、`fluids/inworld.md`、`fluids/recipes.md`

## 第 15 篇：配置、命令与调试

- 选择公共配置、客户端配置或服务端配置。
- 注册命令，并区分权限、参数解析和服务端执行。
- 使用日志、崩溃报告和调试性能分析定位常见问题。
- 排查客户端专属类被服务端加载、资源路径错误和注册阶段错误。

示例：使用 `tutorialmod` 的公共配置和调试命令检查 `silver_ore` 生成与 `silver_crate` 状态。

对应官方文档：`misc/config.md`、`misc/commands.md`、`misc/debugprofiler.md`、`concepts/sides.md`

## 第 16 篇：测试、打包与发布

- 使用 Game Test 验证稳定的服务端行为，并保留必要的客户端手动测试。
- 检查模组元数据、依赖版本和加载条件。
- 构建发布用 JAR，确认开发环境资源没有混入发布文件。
- 区分模组版本、Minecraft 版本和 NeoForge 版本，为后续维护建立规则。

示例：为 `silver_ore` 的掉落和 `silver_crate` 的物品栏编写 Game Test，并打包完整的 `tutorialmod`。

对应官方文档：`misc/gametest.md`、`gettingstarted/modfiles.md`、`gettingstarted/versioning.md`、`misc/updatechecker.md`
