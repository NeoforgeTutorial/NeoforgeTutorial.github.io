# 功能标志 {#feature-flags}

功能标志系统允许开发者通过一组必需的标志控制一组功能，包括已注册元素、游戏机制、数据包条目或模组中的其他独立系统。

常见用例是使用实验性标志控制实验性功能或元素，让玩家在功能最终确定前可以方便地启用并体验它们。

:::tip
你并非必须添加自己的标志。如果某个原版标志适合你的用例，可以直接用它标记方块、物品、实体等。

例如，在 `1.21.3` 中，如果要加入一组苍白橡木方块，通常只应在启用 `WINTER_DROP` 标志时显示这些方块。
:::

## 创建功能标志 {#creating-a-feature-flag}

要创建新的功能标志，需要创建一个 JSON 文件，并在 `neoforge.mods.toml` 的 `[[mods]]` 块中通过 `featureFlags` 条目引用它。指定路径必须相对于 `resources` 目录：

```toml
# 在 neoforge.mods.toml 中：
[[mods]]
    # 文件路径相对于资源的输出目录；编译后则相对于 JAR 内的根路径
    # 'resources' 目录表示资源的根输出目录
    featureFlags="META-INF/feature_flags.json"
```

条目定义包含功能标志名称列表。游戏初始化期间会加载并注册这些标志。

```json5
{
    "flags": [
        // 要注册的功能标志的 Identifier
        "examplemod:experimental"
    ]
}
```

## 获取功能标志 {#retrieving-the-feature-flag}

可以通过 `FeatureFlagRegistry.getFlag(Identifier)` 获取已注册的功能标志。这可以在模组初始化的任意时刻完成。建议把标志保存下来供以后使用，而不是每次需要时都查询注册表。

```java
// 查找 'examplemod:experimental' 功能标志
public static final FeatureFlag EXPERIMENTAL = FeatureFlags.REGISTRY.getFlag(Identifier.fromNamespaceAndPath("examplemod", "experimental"));
```

## 功能元素 {#feature-elements}

`FeatureElement` 是可以设置一组必需标志的注册表值。只有当这些值所需的标志与关卡中启用的标志匹配时，玩家才能使用它们。

禁用某个功能元素后，它会从玩家视野中完全隐藏，所有交互都会被跳过。不过，被禁用的元素仍存在于注册表中，只是无法正常发挥作用。

以下是直接实现 `FeatureElement` 系统的完整注册表列表：

- Item
- Block
- EntityType
- MenuType
- Potion
- MobEffect
- GameRule

### 标记元素 {#flagging-elements}

要让某个 `FeatureElement` 需要你的功能标志，只需把该标志和其他所需标志传给对应的注册方法：

- `Item`：`Item.Properties#requiredFeatures`
- `Block`：`BlockBehaviour.Properties#requiredFeatures`
- `EntityType`：`EntityType.Builder#requiredFeatures`
- `MenuType`：`MenuType#new`
- `Potion`：`Potion#requiredFeatures`
- `MobEffect`：`MobEffect#requiredFeatures`
- `GameRule`：`GameRule#new`

```java
// 只有在启用 'EXPERIMENTAL' 标志后，这些元素才会可用

// Item
DeferredRegister.Items ITEMS = DeferredRegister.createItems("examplemod");
DeferredItem<Item> EXPERIMENTAL_ITEM = ITEMS.registerSimpleItem("experimental", props -> props
    .requiredFeatures(EXPERIMENTAL) // 标记为需要 'EXPERIMENTAL' 标志
);

// Block
DeferredRegister.Blocks BLOCKS = DeferredRegister.createBlocks("examplemod");
// 注意，BlockBehaviour.Properties#ofFullCopy 和 BlockBehaviour.Properties#ofLegacyCopy 会复制所需功能。
// 这意味着在 1.21.3 中，若使用 BlockBehaviour.Properties.ofFullCopy(Blocks.PALE_OAK_WOOD)，
// 你的方块会需要 'WINTER_DROP' 标志。
DeferredBlock<Block> EXPERIMENTAL_BLOCK = BLOCKS.registerSimpleBlock("experimental", BlockBehaviour.Properties.of()
    .requiredFeatures(EXPERIMENTAL) // 标记为需要 'EXPERIMENTAL' 标志
);

// BlockItem 比较特殊，它所需的功能会从其对应 Block 继承。
// 生成蛋及其对应 EntityType 也是如此。
DeferredItem<BlockItem> EXPERIMENTAL_BLOCK_ITEM = ITEMS.registerSimpleBlockItem(EXPERIMENTAL_BLOCK);

// EntityType
DeferredRegister<EntityType<?>> ENTITY_TYPES = DeferredRegister.create(Registries.ENTITY_TYPE, "examplemod");
DeferredHolder<EntityType<?>, EntityType<ExperimentalEntity>> EXPERIMENTAL_ENTITY = ENTITY_TYPES.register("experimental", registryName -> EntityType.Builder.of(ExperimentalEntity::new, MobCategory.AMBIENT)
    .requiredFeatures(EXPERIMENTAL) // 标记为需要 'EXPERIMENTAL' 标志
    .build(ResourceKey.create(Registries.ENTITY_TYPE, registryName))
);

// MenuType
DeferredRegister<MenuType<?>> MENU_TYPES = DeferredRegister.create(Registries.MENU, "examplemod");
DeferredHolder<MenuType<?>, MenuType<ExperimentalMenu>> EXPERIMENTAL_MENU = MENU_TYPES.register("experimental", () -> new MenuType<>(
    // 使用原版的 MenuSupplier：
    // 当你的菜单不会在 `player.openMenu` 期间编码复杂数据时使用。例如：
    // (windowId, inventory) -> new ExperimentalMenu(windowId, inventory),

    // 使用 NeoForge 的 IContainerFactory：
    // 当你希望读取 `player.openMenu` 期间编码的复杂数据时使用。
    // 此处必须进行类型转换，因为 `MenuType` 明确要求传入 `MenuSupplier`。
    (IContainerFactory<ExperimentalMenu>) (windowId, inventory, buffer) -> new ExperimentalMenu(windowId, inventory, buffer),
    
    FeatureFlagSet.of(EXPERIMENTAL) // 标记为需要 'EXPERIMENTAL' 标志
));

// MobEffect
DeferredRegister<MobEffect> MOB_EFFECTS = DeferredRegister.create(Registries.MOB_EFFECT, "examplemod");
DeferredHolder<MobEffect, ExperimentalMobEffect> EXPERIMENTAL_MOB_EEFECT = MOB_EFFECTS.register("experimental", registryName -> new ExperimentalMobEffect(MobEffectCategory.NEUTRAL, CommonColors.WHITE)
    .requiredFeatures(EXPERIMENTAL) // 标记为需要 'EXPERIMENTAL' 标志
);

// Potion
DeferredRegister<Potion> POTIONS = DeferredRegister.create(Registries.POTION, "examplemod");
DeferredHolder<Potion, ExperimentalPotion> EXPERIMENTAL_POTION = POTIONS.register("experimental", registryName -> new ExperimentalPotion(registryName.toString(), new MobEffectInstance(EXPERIMENTAL_MOB_EEFECT))
    .requiredFeatures(EXPERIMENTAL) // 标记为需要 'EXPERIMENTAL' 标志
);

// GameRule
DeferredRegister<GameRule> GAME_RULES = DefeferredRegister.create(Registries.GAME_RULE, "examplemod");
DeferredHolder<GameRule, GameRule> EXPERIMENTAL_GAME_RULE = GAME_RULES.register("experimental", registryName -> new GameRule(
    GameRuleCategory.MISC, GameRuleType.BOOL, BoolArgumentType.bool(), GameRuleTypeVisitor::visitBoolean, Codec.BOOL, bool -> bool ? 1 : 0, false,
    FeatureFlagSet.of(EXPERIMENTAL) // 标记为需要 'EXPERIMENTAL' 标志
));
```

### 验证启用状态 {#validating-enabled-status}

要判断功能是否应启用，首先必须取得已启用功能的集合。可以通过多种方式完成，常见且推荐的方法是 `LevelReader#enabledFeatures`。

```java
level.enabledFeatures(); // 从 'LevelReader' 实例取得
entity.level().enabledFeatures(); // 从 'Entity' 实例取得

// 客户端
minecraft.getConnection().enabledFeatures();

// 服务端
server.getWorldData().enabledFeatures();
```

要验证某个 `FeatureFlagSet` 是否已启用，可以把已启用功能传给 `FeatureFlagSet#isSubsetOf`；要验证某个特定 `FeatureElement` 是否已启用，可以调用 `FeatureElement#isEnabled`。

:::note
`ItemStack` 有一个特殊的 `isItemEnabled(FeatureFlagSet)` 方法。即使背后 `Item` 所需的功能与已启用功能不匹配，空物品堆叠也会被视为已启用。只要可行，建议优先使用此方法，而不是 `Item#isEnabled`。
:::

```java
requiredFeatures.isSubsetOf(enabledFeatures);
featureElement.isEnabled(enabledFeatures);
itemStack.isItemEnabled(enabledFeatures);
```

## 功能包 {#feature-packs}

_另见：[资源包](../resources/index.md#assets)、[数据包](../resources/index.md#data)和 [`pack.mcmeta`](../resources/index.md#packmcmeta)_

功能包是一种特殊资源包，不仅会加载资源和/或数据，还可以启用一组指定的功能标志。这些标志定义在功能包根目录的 `pack.mcmeta` JSON 文件中，格式如下：

:::note
此文件不同于模组 `resources/` 目录中的同名文件。此文件定义的是一个全新的功能包，因此必须放在独立文件夹中。
:::

```json5
{
    "features": {
        "enabled": [
            // 要启用的功能标志的 Identifier
            // 必须是有效且已注册的标志
            "examplemod:experimental"
        ]
    },
    "pack": { /*...*/ }
}
```

玩家可以通过两种方式获得功能包：从外部来源作为数据包安装，或下载带有内置功能包的模组。具体安装方式取决于[物理端](../concepts/sides.md)。

### 内置功能包 {#built-in}

内置包会与模组一起打包，并通过 `AddPackFindersEvent` 事件提供给游戏。

```java
@SubscribeEvent // 在模组事件总线上
public static void addFeaturePacks(final AddPackFindersEvent event) {
    event.addPackFinders(
            // 相对于模组 'resources' 目录并指向此功能包的路径
            // 注意，这也会按以下格式定义功能包 ID：
            // mod/<namespace>:<path>，例如 `mod/examplemod:data/examplemod/datapacks/experimental`
            Identifier.fromNamespaceAndPath("examplemod", "data/examplemod/datapacks/experimental"),
            
            // 此包包含的资源类型
            // 含客户端资源的功能包（资源包）使用 'CLIENT_RESOURCES'
            // 含服务端数据的功能包（数据包）使用 'SERVER_DATA'
            PackType.SERVER_DATA,
            
            // 实验界面中显示的名称
            Component.literal("ExampleMod: Experiments"),
            
            // 要使此包能够加载并启用功能标志，此处必须为 'FEATURE'
            // 其他任何 PackSource 类型在此处都无效
            PackSource.FEATURE,
            
            // 如果为 true，此包始终启用且无法禁用；功能包应始终设为 false
            false,
            
            // 从此包加载资源的优先级
            // 'TOP' 表示此包优先于其他包
            // 'BOTTOM' 表示其他包优先于此包
            Pack.Position.TOP
    );
}
```

#### 在单人游戏中启用 {#enabling-in-singleplayer}

1. 创建新世界。
2. 进入“实验性功能”界面。
3. 启用所需的功能包。
4. 点击“完成”确认更改。

#### 在多人游戏中启用 {#enabling-in-multiplayer}

1. 打开服务器的 `server.properties` 文件。
2. 将功能包 ID 加入 `initial-enabled-packs`，多个包之间使用 `,` 分隔。包 ID 在上方注册包查找器时定义。

### 外部功能包 {#external}

外部包以数据包形式提供给玩家。

#### 在单人游戏中安装 {#installation-in-singleplayer}

1. 创建新世界。
2. 进入数据包选择界面。
3. 将数据包 ZIP 文件拖放到游戏窗口中。
4. 将新出现的数据包移到“已选择”包列表中。
5. 点击“完成”确认更改。

游戏随后会警告新选择的实验性功能可能带来漏洞、问题或崩溃。可以点击“继续”确认更改，或点击“详情”查看所有已选择包及其将启用的功能。

:::note
外部功能包不会出现在实验界面中。实验界面只显示内置功能包。

启用外部功能包后如需禁用它，请返回数据包界面，再将外部包从“已选择”移回“可用”。
:::

#### 在多人游戏中安装 {#installation-in-multiplayer}

功能包只能在世界初次创建时启用，启用后无法禁用。

1. 创建目录 `./world/datapacks`。
2. 将数据包 ZIP 文件上传到新建目录中。
3. 打开服务器的 `server.properties` 文件。
4. 将数据包 ZIP 文件名（不含 `.zip`）加入 `initial-enabled-packs`，多个包之间使用 `,` 分隔。
   - 例如，ZIP 文件 `examplemod-experimental.zip` 应按如下方式添加：`initial-enabled-packs=vanilla,examplemod-experimental`

### 数据生成 {#data-generation}

_另见：[数据生成](../resources/index.md#data-generation)_

功能包可以在常规模组数据生成期间生成。最佳用法是结合内置包使用，不过也可以把生成结果压缩后作为外部包分享。二者只能选择一种，即不要把功能包同时作为外部包提供又打包为内置包。

```java
@SubscribeEvent // 在模组事件总线上
public static void gatherData(final GatherDataEvent.Client event) {
    DataGenerator generator = event.getGenerator();
    
    // 要生成功能包，首先必须获取目标包的包生成器实例。
    // generator.getBuiltinDatapack(<shouldGenerate>, <namespace>, <path>);
    // 这会把功能包生成到以下路径：
    // ./data/<namespace>/datapacks/<path>
    PackGenerator featurePack = generator.getBuiltinDatapack(true, "examplemod", "experimental");
        
    // 注册一个提供器，用于生成 `pack.mcmeta` 文件。
    featurePack.addProvider(output -> PackMetadataGenerator.forFeaturePack(
            output,
            
            // 实验界面中显示的描述
            Component.literal("Enabled experimental features for ExampleMod"),
            
            // 此包应启用的功能标志集合
            FeatureFlagSet.of(EXPERIMENTAL)
    ));
    
    // 向 `featurePack` 注册更多提供器（配方、战利品表），使其生成的资源写入此功能包，
    // 而不是根包。
}
```
