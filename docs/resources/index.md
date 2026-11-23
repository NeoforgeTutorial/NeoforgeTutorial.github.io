---
sidebar_position: 0
---
# 资源

资源是游戏使用、但不属于代码的外部文件。最典型的资源是纹理，不过 Minecraft 生态中还有许多其他资源类型。这些资源都需要代码侧的使用者，因此本部分也按使用系统分组介绍。

Minecraft 通常有两类资源：供[逻辑客户端][logicalsides]使用的资源包资源（assets），以及供[逻辑服务端][logicalsides]使用的数据（data）。资源包资源大多只用于显示，例如纹理、显示模型、翻译或声音；数据则包括战利品表、配方和世界生成等影响玩法的内容。两类资源分别从资源包和数据包加载。NeoForge 会为每个模组生成内置资源包和数据包。

资源包和数据包通常需要 [`pack.mcmeta` 文件][packmcmeta]，但现代 NeoForge 会在运行时自动生成，无需手动处理。

如果不确定某种格式，请参考原版资源。开发环境不仅包含原版代码，也包含原版资源，可在 IntelliJ 的 External Resources 或 Eclipse 的 Project Libraries 中找到，名称分别为 `ng_dummy_ng.net.minecraft:client:client-extra:<minecraft_version>` 和 `ng_dummy_ng.net.neoforged:neoforge:<neoforge_version>`。

## 资源包资源 {#assets}

_另见 [Minecraft Wiki][mcwiki] 上的[资源包][mcwikiresourcepacks]。_

资源包资源，即客户端资源，是只在[客户端][sides]相关的资源。它们从资源包加载，有时也称旧称纹理包。资源包本质上是 `assets` 文件夹，其中每个子文件夹对应一个命名空间。例如 ID 为 `coolmod` 的模组资源包通常包含 `coolmod` 命名空间，也可包含 `minecraft` 等其他命名空间。

NeoForge 会自动把所有模组资源包收集到 `Mod resources` 资源包中，它位于资源包菜单“已选资源包”列表底部，目前无法禁用。上层资源包会覆盖下层资源包中的资源，因此资源包作者可覆盖模组资源，模组开发者也可覆盖原版资源。

资源包可包含以下文件夹：

| 文件夹名         | 内容|
|------------------|-----|
| `atlases`        | 纹理图集源|
| `blockstates`    | [方块状态文件][bsfile]|
| `equipment`      | [装备信息][equipment]|
| `font`           | 字体定义|
| `items`          | [客户端物品][citems]|
| `lang`           | [翻译文件][translations]|
| `models`         | [模型][models]|
| `particles`      | [粒子定义][particles]|
| `post_effect`    | 后处理屏幕效果|
| `shaders`        | 元数据、片段着色器和顶点着色器|
| `sounds`         | [声音文件][sounds]|
| `texts`          | 杂项文本文件|
| `textures`       | [纹理][textures]|
| `waypoint_style` | 路径点图标元数据|

## 数据 {#data}

_另见 [Minecraft Wiki][mcwiki] 上的[数据包][mcwikidatapacks]。_

数据是所有[服务端][sides]资源的统称。与资源包类似，数据通过数据包加载。数据包由 [`pack.mcmeta` 文件][packmcmeta]和根文件夹 `data` 组成，其中每个子文件夹对应一个命名空间。

创建新世界时，NeoForge 会自动应用所有模组数据包，目前无法禁用。大多数数据文件可被更高优先级数据包覆盖（因此也可用空文件移除）。把数据包放入世界的 `datapacks` 子文件夹后，可通过 [`/datapack`][datapackcmd] 命令启用或禁用。

:::info
目前没有内置方法把一组自定义数据包应用到每个世界，不过已有若干模组实现该功能。
:::

数据包可包含以下文件夹：

| 文件夹名| 内容|
|---------|-----|
| `advancement` | [进度][advancements]|
| `banner_pattern` | 旗帜图案|
| `cat_variant`, `chicken_variant`, `cow_variant`, `frog_variant`, `pig_variant`, `wolf_variant`, `zombie_nautilus_variant` | 实体变种|
| `cat_sound_variant`, `chicken_sound_variant`, `cow_sound_variant`, `pig_sound_variant`, `wolf_sound_variant` | 实体声音变种|
| `damage_type` | [伤害类型][damagetypes]|
| `datapacks` | 内置数据包|
| `dialog` | 对话框菜单|
| `enchantment`, `enchantment_provider` | [魔咒][enchantment]|
| `instrument`, `jukebox_song` | 声音引用元数据|
| `painting_variant` | 画作|
| `loot_table` | [战利品表][loottables]|
| `recipe` | [配方][recipes]|
| `tags` | [标签][tags]|
| `test_environment`, `test_instance` | [游戏测试][gmt]|
| `trade_set`, `villager_trade` | 村民交易|
| `trial_spawner` | 战斗挑战|
| `trim_material`, `trim_pattern` | 盔甲纹饰|
| `neoforge/data_maps` | [数据映射][datamap]|
| `neoforge/loot_modifiers` | [全局战利品修改器][glm]|
| `dimension`, `dimension_type`, `structure`, `timeline`, `worldgen`, `neoforge/biome_modifier` | 世界生成文件|

此外，数据包还可包含一些与命令集成的系统文件夹：

| 文件夹名 | 内容|
|----------|-----|
| `chat_type` | [聊天类型][chattype]|
| `function` | [函数][function]|
| `item_modifier` | [物品修改器][itemmodifier]|
| `predicate` | [谓词][predicate]|

## `pack.mcmeta` {#packmcmeta}

[`pack.mcmeta` 文件][meta]保存资源包或数据包的元数据，但 NeoForge 会为模组合成生成该文件，因此在模组中通常不需要。如果仍需要，完整规范见上面链接的 Minecraft Wiki 文章。

## 数据生成 {#data-generation}

数据生成（datagen）是以程序方式生成 JSON 文件，避免手写出错且繁琐的过程。虽然名字中有“数据”，它同样适用于资源包资源。

数据生成通过 Data 运行配置执行，该配置与 Client、Server 配置一起生成。运行配置会执行[模组生命周期][lifecycle]直到注册表事件触发，然后触发 [`GatherDataEvent`][event]，在其中以数据提供器形式注册待生成对象、写入磁盘并结束进程。

它有两个操作于[**物理端**][physicalside]的子类型：`GatherDataEvent.Client` 和 `GatherDataEvent.Server`。前者可包含所有数据提供器，后者只能包含生成数据包条目的提供器。

:::note
推荐两种注册方式：全部注册到 `GatherDataEvent.Client` 并运行 `runClientData`；或把客户端提供器注册到 `.Client`、服务端提供器注册到 `.Server`，分别运行 `runClientData` 和 `runServerData`。MDK 默认采用第一种方式，因此示例都注册到 `GatherDataEvent.Client`。
:::

所有数据提供器都实现 `DataProvider`，通常需要重写一个方法。Minecraft 和 NeoForge 提供的主要生成器如下：

| 类| 方法| 生成内容| 端| 说明|
|----|------|----------|-----|------|
| [`ModelProvider`][modelprovider] | `registerModels()` | 模型、方块状态、客户端物品 | 客户端 | |
| [`LanguageProvider`][langprovider] | `addTranslations()` | 翻译 | 客户端 | 构造时需传入语言 |
| [`EquipmentAssetProvider`][equipmentasset] | `registerModels()` | 盔甲模型资源 | 客户端 | |
| [`ParticleDescriptionProvider`][particleprovider] | `addDescriptions()` | 粒子定义 | 客户端 | |
| [`SoundDefinitionsProvider`][soundprovider] | `registerSounds()` | 声音定义 | 客户端 | |
| `SpriteSourceProvider` | `gather()` | 精灵源/图集 | 客户端 | |
| [`AdvancementProvider`][advancementprovider] | `generate()` | 进度 | 服务端 | 需额外类 |
| [`LootTableProvider`][loottableprovider] | `generate()` | 战利品表 | 服务端 | 需额外类 |
| [`RecipeProvider`][recipeprovider] | `buildRecipes(RecipeOutput)` | 配方 | 服务端 | 需额外类 |
| [`RecipePrioritiesProvider`][recipepriorities] | `start()` | 配方优先级 | 服务端 | |
| [`TagsProvider`][tagsprovider] 的多个子类 | `addTags(HolderLookup.Provider)` | 标签 | 服务端 | |
| [`DataMapProvider`][datamapprovider] | `gather()` | 数据映射条目 | 服务端 | |
| [`GlobalLootModifierProvider`][glmprovider] | `start()` | 全局战利品修改器 | 服务端 | |
| [`DatapackBuiltinEntriesProvider`][datapackprovider] | 无 | 世界生成、伤害类型等数据包内置条目 | 服务端 | 条目在构造方法 lambda 中添加 |
| `JsonCodecProvider` | `gather()` | 带 codec 的对象 | 两端 | 可继承以支持任意 codec 对象 |
| [`PackMetadataGenerator`][metagen] | `add(MetadataSectionType<T>, T)` | `pack.mcmeta` | 两端 | |

这些提供器模式相同：先创建子类添加资源，再在[事件处理器][eventhandler]中注册。`RecipeProvider` 示例：

```java
public class MyRecipeProvider extends RecipeProvider {
    public MyRecipeProvider(HolderLookup.Provider registries, RecipeOutput output) {
        super(registries, output);
    }

    @Override
    protected void buildRecipes() {
        // 在此注册配方。
    }

    public static class Runner extends RecipeProvider.Runner {
        public Runner(PackOutput output, CompletableFuture<HolderLookup.Provider> registries) {
            super(output, registries);
        }

        @Override
        protected RecipeProvider createRecipeProvider(HolderLookup.Provider registries, RecipeOutput output) {
            return new MyRecipeProvider(registries, output);
        }
    }
}

@SubscribeEvent // 在模组事件总线上
public static void gatherData(GatherDataEvent.Client event) {
    // 添加数据包注册表对象时，先调用：
    // event.createDatapackRegistryObjects(...)

    event.createProvider(MyRecipeProvider.Runner::new);

    // 在全局包中创建内置数据包时：
    DataGenerator.PackGenerator examplePack = event.getGenerator().getBuiltinDatapack(
        true, "examplemod", "example_pack"
    );
    examplePack.addProvider(output -> ...);
}
```

事件还提供以下辅助上下文：

- `createDatapackRegistryObjects(...)`：用 `RegistrySetBuilder` 创建并注册 `DatapackBuiltinEntriesProvider`，并让后续 lookup provider 包含生成条目。
- `createProvider(...)`：用接收 `PackOutput` 和可选 `CompletableFuture<HolderLookup.Provider>` 的 lambda 注册提供器。
- `createBlockAndItemTags(...)`：注册方块和物品标签提供器。
- `getGenerator()`：取得 `DataGenerator`。
- `getPackOutput()`：取得 `PackOutput`。
- `getResourceManager(PackType)`：取得可用于检查已有文件的 `ResourceManager`。
- `getLookupProvider()`：取得供标签和生成注册表引用对象的 lookup provider。
- `includeDev()`、`includeReports()`：检查是否启用对应命令行参数。

### 命令行参数

- `--mod examplemod`：为指定模组运行数据生成。NeoGradle 会自动为所属模组添加；一个项目有多个模组时需手动添加。
- `--output path/to/folder`：输出目录。建议用 Gradle 的 `file(...).getAbsolutePath()`。默认 `file('src/generated/resources').getAbsolutePath()`。
- `--existing path/to/folder`：检查已有文件时考虑的目录。
- `--existing-mod examplemod`：检查已有文件时考虑指定模组 JAR 中的资源。
- `--includeDev`：运行开发工具，通常模组不应使用。
- `--includeReports`：导出已注册对象列表。
- `--all`：启用所有生成模式。

可在 `build.gradle` 中添加：

```groovy
runs {
    clientData {
        arguments.addAll '--arg1', 'value1', '--arg2', 'value2', '--all'
    }
}
```

复现默认参数：

```groovy
runs {
    clientData {
        arguments.addAll '--mod', 'examplemod',
                '--output', file('src/generated/resources').getAbsolutePath(),
                '--all'
    }
}
```

[advancementprovider]: server/advancements.md#data-generation
[advancements]: server/advancements.md
[bsfile]: client/models/index.md#blockstate-files
[chattype]: https://minecraft.wiki/w/Chat_type
[citems]: client/models/items.md
[codec]: ../datastorage/codecs.md
[damagetypes]: server/damagetypes.md
[datamap]: server/datamaps/index.md
[datamapprovider]: server/datamaps/index.md#data-generation
[datapackcmd]: https://minecraft.wiki/w/Commands/datapack
[datapackprovider]: ../concepts/registries.md#data-generation-for-datapack-registries
[enchantment]: server/enchantments/index.md
[equipment]: ../items/armor.md#equipment-models
[equipmentasset]: ../items/armor.md#equipment-assets
[event]: ../concepts/events.md
[eventhandler]: ../concepts/events.md#registering-an-event-handler
[function]: https://minecraft.wiki/w/Function_(Java_Edition)
[glm]: server/loottables/glm.md
[glmprovider]: server/loottables/glm.md#datagen
[gmt]: ../../26.1/misc/gametest.md
[itemmodifier]: https://minecraft.wiki/w/Item_modifier
[langprovider]: client/i18n.md#datagen
[lifecycle]: ../concepts/events.md#the-mod-lifecycle
[logicalsides]: ../concepts/sides.md#the-logical-side
[loottableprovider]: server/loottables/index.md#datagen
[loottables]: server/loottables/index.md
[mcwiki]: https://minecraft.wiki
[mcwikidatapacks]: https://minecraft.wiki/w/Data_pack
[mcwikiresourcepacks]: https://minecraft.wiki/w/Resource_pack
[meta]: metadata.md
[metagen]: metadata.md#packmetadatagenerator
[modelprovider]: client/models/datagen.md
[models]: client/models/index.md
[packmcmeta]: #packmcmeta
[packmcmetadatapack]: https://minecraft.wiki/w/Data_pack#pack.mcmeta
[packmcmetaresourcepack]: https://minecraft.wiki/w/Resource_pack#Contents
[particleprovider]: client/particles.md#datagen
[particles]: client/particles.md
[physicalside]: ../concepts/sides.md#the-physical-side
[predicate]: https://minecraft.wiki/w/Predicate
[recipeprovider]: server/recipes/index.md#data-generation
[recipes]: server/recipes/index.md
[recipepriorities]: server/recipes/index.md#recipe-priorities
[sides]: ../concepts/sides.md
[soundprovider]: client/sounds.md#datagen
[sounds]: client/sounds.md
[tags]: server/tags.md
[tagsprovider]: server/tags.md#datagen
[textures]: client/textures.md
[translations]: client/i18n.md#language-files
