---
sidebar_position: 5
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# 盔甲

盔甲是主要通过各种抗性和效果保护 [`LivingEntity`][livingentity] 免受伤害的[物品][item]。许多模组会添加新的盔甲套装（例如铜制盔甲）。

## 自定义盔甲套装

人形实体的盔甲套装通常包含四件物品：头部的头盔、胸部的胸甲、腿部的护腿和脚部的靴子。狼、马和羊驼还有专门用于动物“身体”盔甲槽位的盔甲。这些物品通常由七种[数据组件][datacomponents]实现：

- `DataComponents#MAX_DAMAGE` 和 `#DAMAGE`：耐久度。
- `#MAX_STACK_SIZE`：把堆叠数量设为 `1`。
- `#REPAIRABLE`：在铁砧中修复盔甲。
- `#ENCHANTABLE`：最大[附魔][enchantment]值。
- `#ATTRIBUTE_MODIFIERS`：盔甲、盔甲韧性和击退抗性。
- `#EQUIPPABLE`：实体如何装备该物品。

通常，人形实体盔甲通过 `Item.Properties#humanoidArmor` 设置，狼、马和鹦鹉螺分别使用 `wolfArmor`、`horseArmor` 和 `nautilusArmor`。它们都使用 `ArmorMaterial`，人形盔甲还会结合 `ArmorType` 来设置组件。参考值可在 `ArmorMaterials` 中找到。下面使用铜制盔甲材料作为示例，你可以按需调整数值。

```java
// 用于关联下文 `EquipmentClientInfo` JSON 的装备资源键。
// 指向 assets/examplemod/equipment/copper.json
public static final ResourceKey<EquipmentAsset> COPPER_ASSET = ResourceKey.create(EquipmentAssets.ROOT_ID, Identifier.fromNamespaceAndPath("examplemod", "copper"));

public static final ArmorMaterial COPPER_ARMOR_MATERIAL = new ArmorMaterial(
    // 盔甲材料的耐久倍率。
    // ArmorType 有不同的基础耐久值，再乘以该倍率：
    // - HELMET: 11
    // - CHESTPLATE: 16
    // - LEGGINGS: 15
    // - BOOTS: 13
    // - BODY: 16
    15,
    // 决定防御值（也就是盔甲条上的半盔甲数量）。
    // 根据 ArmorType 设置。
    Util.make(new EnumMap<>(ArmorType.class), map -> {
        map.put(ArmorItem.Type.BOOTS, 2);
        map.put(ArmorItem.Type.LEGGINGS, 4);
        map.put(ArmorItem.Type.CHESTPLATE, 6);
        map.put(ArmorItem.Type.HELMET, 2);
        map.put(ArmorItem.Type.BODY, 4);
    }),
    // 决定盔甲可附魔性，表示该盔甲附魔效果的好坏。
    // 金为 25；我们把铜设为略低于金。
    20,
    // 决定装备该盔甲时播放的声音。
    // 会包装为 Holder。
    SoundEvents.ARMOR_EQUIP_GENERIC,
    // 返回盔甲韧性。韧性会额外参与伤害计算，更多信息见 Minecraft Wiki 的盔甲机制文章：
    // https://minecraft.wiki/w/Armor#Armor_toughness
    // 只有钻石和下界合金的该值大于 0，因此这里返回 0。
    0,
    // 返回盔甲击退抗性。穿着时，玩家会获得一定程度的击退免疫。
    // 如果所有盔甲合计的击退抗性达到 1 或更高，玩家完全不会受到击退。
    // 只有下界合金的该值大于 0，因此这里返回 0。
    0,
    // 决定哪些物品可以修复该盔甲的标签。
    Tags.Items.INGOTS_COPPER,
    // 下文讨论的 EquipmentClientInfo JSON 资源键。
    COPPER_ASSET
);
```

有了 `ArmorMaterial` 后，就可以用它[注册][registering]盔甲：

```java
// ITEMS 是一个 DeferredRegister.Items
public static final DeferredItem<Item> COPPER_HELMET = ITEMS.registerItem(
    "copper_helmet",
    props -> new Item(
        props.humanoidArmor(
            // 使用的材料。
            COPPER_ARMOR_MATERIAL,
            // 要创建的盔甲类型。
            ArmorType.HELMET
        )
    )
);

public static final DeferredItem<Item> COPPER_CHESTPLATE =
    ITEMS.registerItem("copper_chestplate", props -> new Item(props.humanoidArmor(...)));
public static final DeferredItem<Item> COPPER_LEGGINGS =
    ITEMS.registerItem("copper_chestplate", props -> new Item(props.humanoidArmor(...)));
public static final DeferredItem<Item> COPPER_BOOTS =
    ITEMS.registerItem("copper_chestplate", props -> new Item(props.humanoidArmor(...)));

public static final DeferredItem<Item> COPPER_WOLF_ARMOR = ITEMS.registerItem(
    "copper_wolf_armor",
    props -> new Item(
        // 使用的材料。
        props.wolfArmor(COPPER_ARMOR_MATERIAL)
    )
);

public static final DeferredItem<Item> COPPER_HORSE_ARMOR =
    ITEMS.registerItem("copper_horse_armor", props -> new Item(props.horseArmor(...)));

public static final DeferredItem<Item> COPPER_NAUTILUS_ARMOR =
    ITEMS.registerItem("copper_nautilus_armor", props -> new Item(props.nautilusArmor(...)));
```

如果要从头创建盔甲或类似盔甲的物品，可以组合以下内容实现：

- 通过 `Item.Properties#component` 设置 `DataComponents#EQUIPPABLE`，添加具有自定义要求的 `Equippable`。
- 通过 `Item.Properties#attributes` 添加物品属性（例如盔甲、韧性、击退抗性）。
- 通过 `Item.Properties#durability` 添加耐久。
- 通过 `Item.Properties#repariable` 允许修复物品。
- 通过 `Item.Properties#enchantable` 允许物品附魔。
- 把盔甲加入部分 `minecraft:enchantable/*` `ItemTags`，使其可获得特定附魔。

### `Equippable` {#equippable}

`Equippable` 是一种数据组件，说明实体如何装备物品，以及游戏如何渲染。只要物品拥有该组件，无论它是否被视为“盔甲”，都可以被装备（例如鞍、羊驼地毯）。每件拥有该组件的物品只能装备到一个 `EquipmentSlot`。

`Equippable` 可以直接调用 record 构造方法创建，也可以通过 `Equippable#builder` 创建；构建器会设置每个字段的默认值，完成后调用 `build`：

```java
// 用于关联下文 `EquipmentClientInfo` JSON 的装备资源键。
// 指向 assets/examplemod/equipment/equippable.json
public static final ResourceKey<EquipmentAsset> EXAMPLE_EQUIPABBLE = ResourceKey.create(EquipmentAssets.ROOT_ID, Identifier.fromNamespaceAndPath("examplemod", "equippable"));

// 假设存在某个 DeferredRegister.Items ITEMS
public static final DeferredItem<Item> EQUIPPABLE = ITEMS.registerSimpleItem(
    "equippable",
    props -> props.component(
        DataComponents.EQUIPPABLE,
        // 设置物品可以装备到的槽位。
        Equippable.builder(EquipmentSlot.HELMET)
            // 决定装备该物品时播放的声音。
            // 会包装为 Holder。
            // 默认为 SoundEvents#ARMOR_EQUIP_GENERIC。
            .setEquipSound(SoundEvents.ARMOR_EQUIP_GENERIC)
            // 下文讨论的 EquipmentClientInfo JSON 资源键。
            // 未设置时不会渲染装备。
            .setAsset(ResourceKey.create(EXAMPLE_EQUIPABBLE))
            // 穿着时覆盖在玩家屏幕上的贴图相对位置（例如南瓜模糊效果）。
            // 指向 assets/examplemod/textures/equippable.png
            // 未设置时不渲染覆盖层。
            .setCameraOverlay(Identifier.withDefaultNamespace("examplemod", "equippable"))
            // 可以装备该物品的实体类型 HolderSet（直接值或标签）。
            // 未设置时任何实体都可以装备。
            .setAllowedEntities(EntityType.ZOMBIE)
            // 物品从发射器发射时能否被装备。
            // 默认为 true。
            .setDispensable(true),
            // 快速装备时能否从玩家身上换下该物品。
            // 默认为 true。
            .setSwappable(false),
            // 被攻击时物品是否应受损（通常用于装备）。
            // 物品还必须具有耐久。
            // 默认为 true。
            .setDamageOnHurt(false)
            // 交互时（例如右键）能否把物品装备到其他实体。
            // 默认为 false。
            .setEquipOnInteract(true)
            // 为 true 时，拥有 SHEAR_REMOVE_ARMOR 物品能力的物品可以移除该装备。
            // 默认为 false。
            .setCanBeSheared(true)
            // 剪除该装备时播放的声音。
            // 会包装为 holder。
            // 默认为 SoundEvents#SHEARS_SNIP。
            .setShearingSound(SoundEvents.SADDLE_UNEQUIP)
            .build()
    )
);
```

## 装备资源 {#equipment-assets}

现在盔甲已经存在于游戏中，但尝试穿戴时不会渲染，因为还没有指定装备的渲染方式。需要在 `Equippable#assetId` 指定的位置创建 `EquipmentClientInfo` JSON；其路径相对于[资源包][respack]的 `equipment` 文件夹（即 `assets` 文件夹）。`EquipmentClientInfo` 指定每一层渲染所使用的贴图。

在功能上，`EquipmentClientInfo` 是把 `EquipmentClientInfo.LayerType` 映射到待应用 `EquipmentClientInfo.Layer` 列表的映射。

可以把 `LayerType` 理解为某个实例所需渲染的一组贴图。例如，`LayerType#HUMANOID` 由 `HumanoidArmorLayer` 用于渲染人形实体的头部、胸部和脚部；`LayerType#WOLF_BODY` 由 `WolfArmorLayer` 用于渲染身体盔甲。如果它们属于同一种可装备物品（例如铜制盔甲），可以合并到一个装备信息 JSON 中。

`LayerType` 映射到一组 `Layer`，系统会按给定顺序应用并渲染贴图。一个 `Layer` 实际上表示一张待渲染贴图。第一个参数是贴图相对于 `textures/entity/equipment` 的位置。

第二个参数是可选值，表示[贴图能否着色][tinting]为 `EquipmentClientInfo.Dyeable`。`Dyeable` 对象保存一个整数；存在时表示贴图默认使用的 RGB 颜色，不存在则使用纯白色。

:::warning
要让物品应用未染色颜色以外的着色，物品必须位于 [`ItemTags#DYEABLE`][tag] 中，并且 `DataComponents#DYED_COLOR` 组件设置为某个 RGB 值。
:::

第三个参数是布尔值，表示渲染时是否应使用传入贴图，而不是 `Layer` 中定义的贴图。自定义披风或鞘翅贴图就是一个例子。

下面为铜制盔甲材料创建装备信息。假设每一层都有两张贴图：实际盔甲贴图和着色覆盖贴图；动物盔甲则使用传入的动态贴图。

<Tabs>
<TabItem value="json" label="JSON" default>

```json5
// 位于 assets/examplemod/equipment/copper.json
{
    // 层映射
    "layers": {
        // 要应用的 EquipmentClientInfo.LayerType 序列化名称。
        // 用于人形头部、胸部和脚部
        "humanoid": [
            // 按给定顺序渲染的层列表
            {
                // 盔甲贴图的相对位置
                // 指向 assets/examplemod/textures/entity/equipment/humanoid/copper/outer.png
                "texture": "examplemod:copper/outer"
            },
            {
                // 覆盖贴图
                // 指向 assets/examplemod/textures/entity/equipment/humanoid/copper/outer_overlay.png
                "texture": "examplemod:copper/outer_overlay",
                // 指定后，允许使用 DataComponents#DYED_COLOR 中的颜色为贴图着色
                // 否则不能着色
                "dyeable": {
                    // RGB 值（始终为不透明颜色）
                    // 0x7683DE 的十进制值
                    // 未指定时为 0（表示透明或不可见）
                    "color_when_undyed": 7767006
                }
            }
        ],
        // 用于人形腿部
        "humanoid_leggings": [
            {
                // 指向 assets/examplemod/textures/entity/equipment/humanoid_leggings/copper/inner.png
                "texture": "examplemod:copper/inner"
            },
            {
                // 指向 assets/examplemod/textures/entity/equipment/humanoid_leggings/copper/inner_overlay.png
                "texture": "examplemod:copper/inner_overlay",
                "dyeable": {
                    "color_when_undyed": 7767006
                }
            }
        ],
        // 用于狼盔甲
        "wolf_body": [
            {
                // 指向 assets/examplemod/textures/entity/equipment/wolf_body/copper/wolf.png
                "texture": "examplemod:copper/wolf",
                // 为 true 时，使用传入层渲染器的贴图
                "use_player_texture": true
            }
        ],
        // 用于马盔甲
        "horse_body": [
            {
                // 指向 assets/examplemod/textures/entity/equipment/horse_body/copper/horse.png
                "texture": "examplemod:copper/horse",
                "use_player_texture": true
            }
        ],
        // 用于鹦鹉螺盔甲
        "nautilus_body": [
            {
                // 指向 assets/examplemod/textures/entity/equipment/nautilus_body/copper/nautilus.png
                "texture": "examplemod:copper/nautilus",
                "use_player_texture": true
            }
        ]
    }
}
```

</TabItem>

<TabItem value="datagen" label="数据生成">

```java
public class MyEquipmentInfoProvider extends EquipmentAssetProvider {

    public MyEquipmentInfoProvider(PackOutput output) {
        super(output);
    }

    @Override
    protected void registerModels(BiConsumer<ResourceKey<EquipmentAsset>, EquipmentClientInfo> output) {
        output.accept(
            // 必须与 Equippable#assetId 匹配
            COPPER_ASSET,
            EquipmentClientInfo.builder()
                // 用于人形头部、胸部和脚部
                .addLayers(
                    EquipmentClientInfo.LayerType.HUMANOID,
                    // 基础贴图
                    new EquipmentClientInfo.Layer(
                        // 盔甲贴图的相对位置
                        // 指向 assets/examplemod/textures/entity/equipment/humanoid/copper/outer.png
                        Identifier.fromNamespaceAndPath("examplemod", "copper/outer"),
                        Optional.empty(),
                        false
                    ),
                    // 覆盖贴图
                    new EquipmentClientInfo.Layer(
                        // 覆盖贴图
                        // 指向 assets/examplemod/textures/entity/equipment/humanoid/copper/outer_overlay.png
                        Identifier.fromNamespaceAndPath("examplemod", "copper/outer_overlay"),
                        // RGB 值（始终为不透明颜色）
                        // 未指定时为 0（表示透明或不可见）
                        Optional.of(new EquipmentClientInfo.Dyeable(Optional.of(0x7683DE))),
                        false
                    )
                )
                // 用于人形腿部
                .addLayers(
                    EquipmentClientInfo.LayerType.HUMANOID_LEGGINGS,
                    new EquipmentClientInfo.Layer(
                        // 指向 assets/examplemod/textures/entity/equipment/humanoid_leggings/copper/inner.png
                        Identifier.fromNamespaceAndPath("examplemod", "copper/inner"),
                        Optional.empty(),
                        false
                    ),
                    new EquipmentClientInfo.Layer(
                        // 指向 assets/examplemod/textures/entity/equipment/humanoid_leggings/copper/inner_overlay.png
                        Identifier.fromNamespaceAndPath("examplemod", "copper/inner_overlay"),
                        Optional.of(new EquipmentClientInfo.Dyeable(Optional.of(0x7683DE))),
                        false
                    )
                )
                // 用于狼盔甲
                .addLayers(
                    EquipmentClientInfo.LayerType.WOLF_BODY,
                    // 基础贴图
                    new EquipmentClientInfo.Layer(
                        // 指向 assets/examplemod/textures/entity/equipment/wolf_body/copper/wolf.png
                        Identifier.fromNamespaceAndPath("examplemod", "copper/wolf"),
                        Optional.empty(),
                        // 为 true 时，使用传入层渲染器的贴图
                        true
                    )
                )
                // 用于马盔甲
                .addLayers(
                    EquipmentClientInfo.LayerType.HORSE_BODY,
                    // 基础贴图
                    new EquipmentClientInfo.Layer(
                        // 指向 assets/examplemod/textures/entity/equipment/horse_body/copper/horse.png
                        Identifier.fromNamespaceAndPath("examplemod", "copper/horse"),
                        Optional.empty(),
                        true
                    )
                )
                // 用于鹦鹉螺盔甲
                .addLayers(
                    EquipmentClientInfo.LayerType.NAUTILUS_BODY,
                    // 基础贴图
                    new EquipmentClientInfo.Layer(
                        // 指向 assets/examplemod/textures/entity/equipment/nautilus_body/copper/nautilus.png
                        Identifier.fromNamespaceAndPath("examplemod", "copper/nautilus"),
                        Optional.empty(),
                        true
                    )
                )
                .build()
        );
    }
}

@SubscribeEvent // 在模组事件总线上
public static void gatherData(GatherDataEvent.Client event) {
    event.createProvider(MyEquipmentInfoProvider::new);
}
```

</TabItem>
</Tabs>

## 装备渲染 {#equipment-rendering}

装备信息由 `EntityRenderer` 或其某个 `RenderLayer` 渲染函数中的 `EquipmentLayerRenderer` 渲染。可以通过 `EntityRendererProvider.Context#getEquipmentRenderer` 从渲染上下文取得 `EquipmentLayerRenderer`。如果需要 `EquipmentClientInfo`，也可以通过 `EntityRendererProvider.Context#getEquipmentAssets` 取得。

默认情况下，以下层渲染对应的 `EquipmentClientInfo.LayerType`：

| `LayerType` | `RenderLayer` | 使用者 |
|:-----------------------:|:----------------------:|:---------------------------------------------------------------|
| `HUMANOID` | `HumanoidArmorLayer` | 玩家、人形生物（例如僵尸、骷髅）、盔甲架 |
| `HUMANOID_LEGGINGS` | `HumanoidArmorLayer` | 玩家、人形生物（例如僵尸、骷髅）、盔甲架 |
| `HUMANOID_BABY` | `HumanoidArmorLayer` | 玩家、幼年人形生物（例如幼年僵尸） |
| `WINGS` | `WingsLayer` | 玩家、人形生物（例如僵尸、骷髅）、盔甲架 |
| `WOLF_BODY` | `WolfArmorLayer` | 狼 |
| `HORSE_BODY` | `HorseArmorLayer` | 马 |
| `LLAMA_BODY` | `LlamaDecorLayer` | 羊驼、行商羊驼 |
| `PIG_SADDLE` | `SimpleEquipmentLayer` | 猪 |
| `STRIDER_SADDLE` | `SimpleEquipmentLayer` | 炽足兽 |
| `CAMEL_SADDLE` | `SimpleEquipmentLayer` | 骆驼 |
| `CAMEL_HUSK_SADDLE` | `SimpleEquipmentLayer` | 骆驼尸壳 |
| `HORSE_SADDLE` | `SimpleEquipmentLayer` | 马 |
| `DONKEY_SADDLE` | `SimpleEquipmentLayer` | 驴 |
| `MULE_SADDLE` | `SimpleEquipmentLayer` | 骡 |
| `ZOMBIE_HORSE_SADDLE` | `SimpleEquipmentLayer` | 僵尸马 |
| `SKELETON_HORSE_SADDLE` | `SimpleEquipmentLayer` | 骷髅马 |
| `HAPPY_GHAST_BODY` | `SimpleEquipmentLayer` | 快乐恶魂 |
| `NAUTILUS_SADDLE` | `SimpleEquipmentLayer` | 鹦鹉螺 |
| `NAUTILUS_BODY` | `SimpleEquipmentLayer` | 鹦鹉螺 |

`EquipmentLayerRenderer` 只有一个提交装备层渲染的方法：`renderLayers`。

```java
// 位于某个可以使用 EquipmentLayerRenderer equipmentLayerRenderer 的渲染方法中
this.equipmentLayerRenderer.renderLayers(
    // 要渲染的层类型
    EquipmentClientInfo.LayerType.HUMANOID,
    // 表示 EquipmentClientInfo JSON 的资源键
    // 会通过 `assetId` 设置到 `EQUIPPABLE` 数据组件中
    stack.get(DataComponents.EQUIPPABLE).assetId().orElseThrow(),
    // 应用装备信息的模型
    // 这些通常是与实体模型分开的模型，
    // 也是关联到 LayerDefinition 的独立 ModelLayer
    model,
    // 作为模型渲染的物品堆
    // 仅用于取得可染色、光效和盔甲纹饰信息
    stack,
    // 用于把模型渲染到正确位置的 pose stack
    poseStack,
    // 用于提交模型数据的 collector
    collector,
    // 打包后的光照坐标
    lightCoords,
    // 某一层设置 use_player_texture 为 true 时要渲染的贴图绝对路径；不为 null 时使用
    // 表示 assets 文件夹内的绝对位置
    Identifier.fromNamespaceAndPath("examplemod", "textures/other_texture.png"),
    // 模型轮廓颜色
    // 仅在轮廓颜色不为 0，且 `RenderType` 具有或属于轮廓类型时使用
    outlineColor,
    // 提交层和纹饰的初始顺序优先级，每提交一个模型就递增
    // 默认为 1
    order
);
```

[item]: index.md
[datacomponents]: datacomponents.md
[enchantment]: ../resources/server/enchantments/index.md#enchantment-costs-and-levels
[livingentity]: ../entities/livingentity.md
[registering]: ../concepts/registries.md#methods-for-registering
[rendering]: #equipment-rendering
[respack]: ../resources/index.md#assets
[tag]: ../resources/server/tags.md
[tinting]: ../resources/client/models/index.md#tinting
