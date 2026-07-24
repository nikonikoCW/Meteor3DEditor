# GLB 节点 BID 持久化架构设计

## 1. 背景

Meteor3D 当前由以下三个主要模块组成：

- `packages/asset-manager`：负责 GLB 等资产的上传、处理和管理。
- `packages/scene-editor`：负责通过拖拽方式搭建和编辑场景。
- `packages/core`：负责 Three.js 核心渲染、模型加载、场景持久化和对外 API。

当前 GLB 模型加载到编辑器后会形成一棵 `Object3D` 树。Three.js 会为每个节点生成运行时 `uuid`，但模型在页面刷新后会重新经过 `GLTFLoader` 和 `SkeletonUtils.clone()`，因此子节点的 `uuid` 会发生变化。

这会造成以下问题：

- 无法稳定引用 GLB 子节点。
- 节点选中、事件绑定、数据绑定等业务关系在刷新后失效。
- 当前使用名称或 `children` 下标组成的路径保存修改，在节点重名、插入、删除、排序或换父节点后会失效。
- 同一个模型被多次拖入场景时，无法同时满足资产节点匹配和场景节点全局唯一。

本设计为场景中的每个节点引入持久化业务标识 `bid`。

## 2. 设计目标

### 2.1 核心目标

场景中的每个节点，包括 GLB 根节点、GLB 子节点、编辑器创建的 Group、Mesh、灯光等，都必须拥有自己的 `bid`。

在同一个场景中：

- 任意两个节点的 `bid` 都不能相同。
- 同一个 GLB 被拖入多次时，每个实例及其全部子节点必须获得不同的 `bid`。
- 页面刷新后，已有节点必须恢复原来的 `bid`。
- 节点改名、修改属性、排序或者换父节点时，`bid` 不变。
- 节点复制时，复制出来的节点必须生成新的 `bid`。
- Undo/Redo 恢复节点时，必须恢复原来的 `bid`。

### 2.2 非目标

- 不使用 `bid` 替换或修改 Three.js 原生 `uuid`。
- 不依赖节点名称、节点路径、父节点或 `children` 下标生成 `bid`。
- 不把场景中的 `bid` 固化到公共 GLB 资产中。
- 不在场景数据库中重复存储 GLB 的完整几何和纹理数据。

## 3. 身份模型

系统需要区分三种身份：

| 标识 | 作用域 | 用途 | 是否持久化 |
| --- | --- | --- | --- |
| `uuid` | 当前 Three.js 运行时 | Three.js 内部对象标识 | 否 |
| `assetNodeId` | 单个资产版本 | 定位 GLB 中的原始节点 | 是，保存在资产中 |
| `bid` | 单个场景 | 唯一标识场景中的节点实例 | 是，保存在场景中 |

### 3.1 assetNodeId

`assetNodeId` 表示“这是资产版本中的哪个节点”。

特性：

- 在同一个资产版本中唯一。
- 同一个资产被拖入场景多次时，各实例对应节点的 `assetNodeId` 可以相同。
- 资产压缩、转换和生成 LOD 时，应尽可能保持不变。
- 仅用于加载恢复、资产升级和来源追踪，不作为场景业务唯一标识。

### 3.2 bid

`bid` 表示“这是当前场景中的哪个节点实例”。

特性：

- 在整个场景中唯一。
- 节点首次进入场景时生成。
- 保存到场景数据中。
- 页面刷新时从场景数据恢复，不能重新生成。
- 移动、改名和修改属性时保持不变。
- 复制节点或复制模型实例时重新生成。

### 3.3 instanceBid

每次把资产拖入场景都会创建一个新的资产实例，资产实例根节点的 `bid` 同时作为 `instanceBid`。

例如，同一个椅子模型拖入两次：

```text
资产节点                    实例 A                 实例 B

Root(assetNodeId=root)      bid=A-root             bid=B-root
Seat(assetNodeId=seat)      bid=A-seat             bid=B-seat
Leg(assetNodeId=leg)        bid=A-leg               bid=B-leg
```

`assetNodeId` 相同，但所有 `bid` 都不同。

## 4. BID 生成策略

推荐使用 UUIDv7 或其他随机、高唯一性的字符串 ID：

```js
function generateBid() {
  return crypto.randomUUID();
}
```

如果后续需要按时间排序，可以使用 UUIDv7 实现。

推荐策略是：

1. 节点第一次进入场景时随机生成 `bid`。
2. 将 `assetNodeId -> bid` 映射显式保存到场景数据。
3. 刷新时根据 `assetNodeId` 恢复原 `bid`。

不建议仅通过 `assetNodeId` 确定性生成 `bid`，因为同一个资产被多次实例化会产生冲突。

理论上可以使用：

```text
bid = UUIDv5(instanceBid, assetNodeId)
```

但显式保存随机 BID 的方案更适合未来的节点复制、资产升级、数据迁移和问题排查。

## 5. Asset Manager 设计

## 5.1 上传阶段注入 assetNodeId

GLB 上传后，在压缩、格式转换和 LOD 处理之前，遍历 glTF 的 `nodes[]`。

对于每个缺少 `assetNodeId` 的节点，生成一个新的 `assetNodeId`，写入 glTF `extras`：

```json
{
  "name": "Seat",
  "extras": {
    "meteorAssetNodeId": "an_019f..."
  }
}
```

Three.js 的 `GLTFLoader` 加载 glTF `extras` 后，通常会将其放入节点的 `userData`：

```js
object.userData.meteorAssetNodeId
```

正式实现时应在导入测试中验证 GLTFLoader 对该字段的保留情况，并在加载层做统一归一化：

```js
object.userData.assetNodeId =
  object.userData.meteorAssetNodeId;
```

## 5.2 资产版本

资产需要引入不可变版本：

```json
{
  "assetId": "asset-chair",
  "assetVersionId": "av-019f...",
  "contentHash": "sha256:...",
  "originalUrl": "...",
  "compressedUrl": "...",
  "nodeManifest": {
    "an-root": {
      "name": "Chair",
      "type": "Group"
    },
    "an-seat": {
      "name": "Seat",
      "type": "Mesh"
    }
  }
}
```

场景应优先保存 `assetId + assetVersionId`，而不是只保存 URL。URL 是当前的资源访问地址，不应作为身份。

原因包括：

- URL 内容可能被覆盖。
- 同一个资产的不同版本可能拥有不同节点结构。
- 节点恢复依赖精确的资产版本。

## 5.3 派生资产处理

原始版、压缩版和 LOD 版应尽可能保留相同的 `assetNodeId`。

处理规则：

- 仅压缩 Mesh、纹理或 Buffer 时，节点 ID 原样保留。
- 重命名节点时，节点 ID 原样保留。
- 修改节点 Transform 时，节点 ID原样保留。
- 合并或拆分节点时，输出源节点到派生节点的映射清单。
- LOD 过程中生成的纯渲染辅助节点，不应默认暴露为可编辑业务节点。

如果处理管线无法保留节点一一对应关系，则派生版本不能直接作为可编辑节点树的身份来源，应使用原始资产的节点清单作为逻辑节点树。

## 6. Scene Editor 设计

## 6.1 拖拽数据

资产面板拖拽模型时，不应只传 URL，应传递资产引用：

```json
{
  "type": "GLTFModel",
  "assetId": "asset-chair",
  "assetVersionId": "av-019f...",
  "url": "/assets/chair/compressed.glb"
}
```

其中：

- `assetId`：资产逻辑 ID。
- `assetVersionId`：场景绑定的不可变资产版本。
- `url`：本次加载使用的资源地址。

## 6.2 首次拖入

同一个模型每次拖入场景时都视为一个新的场景实例。

```js
function assignNewTreeBids(root, assetRef) {
  const instanceBid = generateBid();

  root.traverse((node) => {
    node.userData.bid = node === root
      ? instanceBid
      : generateBid();

    node.userData.assetId = assetRef.assetId;
    node.userData.assetVersionId = assetRef.assetVersionId;
    node.userData.originInstanceBid = instanceBid;
  });

  return instanceBid;
}
```

注意：

- 模型缓存中不能保存场景 BID。
- 从模板 Clone 出来的新实例必须清除旧 BID。
- 每次拖入都要给整棵树生成一套新的 BID。

```js
function cloneAssetTemplate(template) {
  const clone = SkeletonUtils.clone(template);

  clone.traverse((node) => {
    delete node.userData.bid;
    delete node.userData.originInstanceBid;
  });

  return clone;
}
```

## 6.3 编辑器创建节点

编辑器创建的节点没有 `assetNodeId`，创建时直接生成 BID：

```js
function initializeEditorNode(node) {
  node.userData.bid = generateBid();
  node.userData.assetNodeId = null;
  node.userData.nodeSource = 'editor';
}
```

对于编辑器创建的节点，场景保存时需要记录足以重建节点的信息，例如：

- 类型。
- 名称。
- Transform。
- Geometry 参数或资源引用。
- Material 参数或资源引用。
- `parentBid`。
- 兄弟顺序。

## 6.4 场景树

场景树组件应使用 BID 作为 Vue Key 和选中标识：

```vue
<TreeNode
  v-for="node in nodes"
  :key="node.userData.bid"
  :node="node"
/>
```

选中状态从：

```js
selectedObject.uuid
```

逐步迁移为：

```js
selectedObject.userData.bid
```

## 7. Core 设计

## 7.1 BidRegistry

在 `packages/core` 中增加全场景唯一的 BID 注册表。

```js
export class BidRegistry {
  constructor() {
    this.byBid = new Map();
    this.byObject = new WeakMap();
  }

  register(object) {
    const bid = object?.userData?.bid;

    if (!bid) {
      throw new Error('Cannot register object without bid');
    }

    const existing = this.byBid.get(bid);

    if (existing && existing !== object) {
      throw new Error(`Duplicate scene bid: ${bid}`);
    }

    this.byBid.set(bid, object);
    this.byObject.set(object, bid);
  }

  registerTree(root) {
    root.traverse((node) => this.register(node));
  }

  getObject(bid) {
    return this.byBid.get(bid) ?? null;
  }

  getBid(object) {
    return this.byObject.get(object)
      ?? object?.userData?.bid
      ?? null;
  }

  unregisterTree(root) {
    root.traverse((node) => {
      const bid = this.getBid(node);

      if (bid) {
        this.byBid.delete(bid);
      }

      this.byObject.delete(node);
    });
  }

  clear() {
    this.byBid.clear();
    this.byObject = new WeakMap();
  }
}
```

`object.userData.bid` 便于调试和组件访问，`BidRegistry` 负责：

- 全场景唯一性校验。
- 通过 BID 快速查询 Object3D。
- 模型树批量注册和反注册。
- 防止复制或反序列化过程中产生 BID 冲突。

## 7.2 API 迁移

Core 对外 API 应逐步以 BID 作为业务参数：

```js
findObjectByBid(bid)
setObjectVisibleByBid(bid, visible)
enableOutlineByBid(bid, options)
enableHighlightByBid(bid, options)
removeObjectByBid(bid)
```

迁移期可以保留原 UUID API，但新业务不得继续保存 Three.js UUID。

不应再将持久化 ID写回：

```js
object.uuid = persistedId;
```

Three.js `uuid` 应保持运行时语义。

## 8. 场景数据结构

推荐升级为 `schemaVersion: 2`。

场景以 BID 为主键，保存资产实例、场景节点和当前层级结构。

```json
{
  "schemaVersion": 2,
  "sceneId": "scene-001",
  "revision": 12,

  "assetInstances": {
    "bid-instance-a": {
      "bid": "bid-instance-a",
      "assetId": "asset-chair",
      "assetVersionId": "av-019f...",
      "url": "/assets/chair/compressed.glb"
    }
  },

  "nodes": {
    "bid-instance-a": {
      "bid": "bid-instance-a",
      "kind": "assetNode",
      "parentBid": null,
      "order": 0,
      "source": {
        "assetId": "asset-chair",
        "assetVersionId": "av-019f...",
        "assetNodeId": "an-root",
        "originInstanceBid": "bid-instance-a"
      },
      "props": {
        "name": "Chair",
        "visible": true,
        "position": [0, 0, 0],
        "rotation": [0, 0, 0],
        "scale": [1, 1, 1]
      }
    },

    "bid-seat-a": {
      "bid": "bid-seat-a",
      "kind": "assetNode",
      "parentBid": "bid-instance-a",
      "order": 0,
      "source": {
        "assetId": "asset-chair",
        "assetVersionId": "av-019f...",
        "assetNodeId": "an-seat",
        "originInstanceBid": "bid-instance-a"
      },
      "props": {
        "visible": true
      }
    },

    "bid-custom-group": {
      "bid": "bid-custom-group",
      "kind": "Group",
      "parentBid": "bid-seat-a",
      "order": 0,
      "source": {
        "type": "editor"
      },
      "props": {
        "name": "Custom Group",
        "visible": true,
        "position": [0, 0, 0],
        "rotation": [0, 0, 0],
        "scale": [1, 1, 1]
      }
    }
  },

  "deletedSourceNodes": [
    {
      "originInstanceBid": "bid-instance-a",
      "assetNodeId": "an-leg"
    }
  ]
}
```

### 8.1 parentBid

`parentBid` 表示节点当前所在的场景层级。

节点被拖拽到其他父节点下面时，只修改：

- `parentBid`。
- `order`。
- 必要时修改局部 Transform。

不修改：

- `bid`。
- `assetNodeId`。
- `originInstanceBid`。

### 8.2 originInstanceBid

`originInstanceBid` 表示资产节点最初来自哪个资产实例。

它和当前 `parentBid` 必须分开，因为节点未来可能被移动到：

- 同一资产的其他节点下面。
- 另一个资产实例下面。
- 编辑器创建的 Group 下面。
- 场景根节点下面。

### 8.3 deletedSourceNodes

GLB 原生节点被删除后，重新加载资产时仍会再次出现。

因此删除资产原生节点需要保存 tombstone：

```json
{
  "originInstanceBid": "bid-instance-a",
  "assetNodeId": "an-leg"
}
```

加载时先实例化 GLB，再根据 tombstone 删除对应节点。

编辑器创建的节点删除后，可以直接从持久化节点表中移除。

## 9. 加载流程

页面刷新后按照以下顺序恢复场景：

1. 读取场景文档。
2. 校验 `schemaVersion`。
3. 收集所有 `assetVersionId` 并并行加载资产。
4. 为每个资产实例 Clone 独立 Object3D 树。
5. 建立 `assetNodeId -> Object3D` 映射。
6. 从场景 `nodes` 中恢复每个节点的 `bid`。
7. 注册到全局 `BidRegistry`，发现重复立即终止或报告数据错误。
8. 创建编辑器新增的 Group、Mesh、灯光等节点。
9. 应用 `deletedSourceNodes`。
10. 根据 `parentBid + order` 重建场景树。
11. 应用 Transform、Visible、Material 等覆盖属性。
12. 恢复编辑器选中、数据绑定和其他业务状态。

伪代码：

```js
async function restoreScene(sceneDocument) {
  bidRegistry.clear();

  const loadedInstances = await loadAssetInstances(
    sceneDocument.assetInstances
  );

  for (const instance of loadedInstances) {
    const persistedNodes = getNodesByOriginInstanceBid(
      sceneDocument.nodes,
      instance.bid
    );

    const objectByAssetNodeId =
      indexAssetNodes(instance.object);

    for (const record of persistedNodes) {
      const object = objectByAssetNodeId.get(
        record.source.assetNodeId
      );

      if (!object) {
        reportMissingAssetNode(record);
        continue;
      }

      object.userData.bid = record.bid;
      object.userData.originInstanceBid =
        record.source.originInstanceBid;

      bidRegistry.register(object);
    }
  }

  createEditorNodes(sceneDocument.nodes);
  applyDeletedSourceNodes(sceneDocument.deletedSourceNodes);
  rebuildHierarchy(sceneDocument.nodes);
  applyNodeProperties(sceneDocument.nodes);
}
```

## 10. 保存流程

保存时遍历场景中所有业务节点，生成以 BID 为主键的节点表。

需要校验：

- 每个节点都有 `bid`。
- 全场景不存在重复 BID。
- 除场景根节点外，每个节点都有有效的 `parentBid`。
- 不存在父子循环。
- 每个资产节点都具备 `assetVersionId + assetNodeId + originInstanceBid`。
- 编辑器节点具备可反序列化的数据。

伪代码：

```js
function serializeScene(sceneRoots) {
  const nodes = {};

  for (const root of sceneRoots) {
    root.traverse((object) => {
      const bid = object.userData.bid;

      if (!bid) {
        throw new Error('Scene node has no bid');
      }

      if (nodes[bid]) {
        throw new Error(`Duplicate scene bid: ${bid}`);
      }

      nodes[bid] = serializeNode(object);
    });
  }

  validateSceneGraph(nodes);

  return {
    schemaVersion: 2,
    nodes
  };
}
```

场景保存应是一个带 `revision` 的原子操作，防止并发保存覆盖较新的场景数据。

## 11. 节点操作语义

## 11.1 新增

- 新资产实例：整棵树生成新 BID。
- 新建编辑器节点：节点创建时生成新 BID。
- 注册前检查 BID 是否重复。

## 11.2 修改

修改以下属性不会影响 BID：

- 名称。
- Transform。
- Visible。
- Material。
- 自定义业务属性。

修改记录以 BID 为主键，不再以节点路径为主键。

## 11.3 移动和换父节点

移动节点时：

1. 检查目标父节点是否存在。
2. 检查目标父节点不是节点自身。
3. 检查目标父节点不是节点后代，防止循环。
4. 使用 `Object3D.attach()` 保持世界坐标不变。
5. 更新 `parentBid` 和 `order`。
6. 更新节点局部 Transform。
7. 保持 `bid` 不变。

```js
function reparentNode(node, newParent, newOrder) {
  assertNoCycle(
    node.userData.bid,
    newParent.userData.bid
  );

  newParent.attach(node);

  sceneGraph.updateParent({
    bid: node.userData.bid,
    parentBid: newParent.userData.bid,
    order: newOrder
  });
}
```

跨资产树移动和普通换父节点采用相同规则。

## 11.4 复制

复制表示产生新的场景节点实例。

复制单个节点或子树时，复制树中的所有节点都必须生成新的 BID：

```js
function cloneAsNewSceneNodes(source) {
  const clone = SkeletonUtils.clone(source);

  clone.traverse((node) => {
    node.userData.bid = generateBid();
  });

  return clone;
}
```

复制节点可以保留：

- `assetId`。
- `assetVersionId`。
- `assetNodeId`。
- 几何和材质来源。

但不能保留原 `bid`。

## 11.5 删除

删除编辑器节点：

- 从场景图和 BidRegistry 移除。
- 保存时不再输出该节点。

删除资产原生节点：

- 从当前场景图和 BidRegistry 移除。
- 保存 tombstone，防止刷新后重新出现。

删除操作是否级联，应按照当前 `parentBid` 场景树执行，不应按照 `originInstanceBid` 执行。

已经被移动到资产实例外部的节点，不应因为删除原资产根节点而被自动删除，除非它仍是被删除根节点的当前后代。

## 11.6 Undo/Redo

命令对象至少需要保存：

- 操作节点的 BID。
- 原父节点 BID。
- 新父节点 BID。
- 原兄弟顺序。
- 新兄弟顺序。
- 原局部 Transform。
- 新局部 Transform。
- 删除节点的序列化快照。

Undo 恢复节点时必须使用原 BID，不能生成新 BID。

## 12. Command 架构

Scene Editor 建议提供以下命令：

```text
CreateNodeCommand
DeleteNodeCommand
UpdateNodeCommand
ReparentNodeCommand
DuplicateNodeCommand
```

命令应通过 BID 查找节点，而不是长期依赖 Object3D 引用或 UUID。

示例：

```js
class ReparentNodeCommand {
  constructor({
    bidRegistry,
    sceneGraph,
    nodeBid,
    oldParentBid,
    newParentBid,
    oldOrder,
    newOrder,
    oldTransform,
    newTransform
  }) {
    Object.assign(this, arguments[0]);
  }

  execute() {
    this.apply(
      this.newParentBid,
      this.newOrder,
      this.newTransform
    );
  }

  undo() {
    this.apply(
      this.oldParentBid,
      this.oldOrder,
      this.oldTransform
    );
  }

  apply(parentBid, order, transform) {
    const node = this.bidRegistry.getObject(this.nodeBid);
    const parent = this.bidRegistry.getObject(parentBid);

    parent.add(node);
    applyTransform(node, transform);
    this.sceneGraph.updateParent(
      this.nodeBid,
      parentBid,
      order
    );
  }
}
```

## 13. 三个 Package 的职责边界

### 13.1 packages/asset-manager

负责：

- 为 GLB 节点注入 `assetNodeId`。
- 维护不可变 `assetVersionId`。
- 生成 `nodeManifest`。
- 确保压缩和派生资产保留节点 ID。
- 输出节点合并、拆分和 LOD 映射。

不负责：

- 生成场景 BID。
- 维护场景父子关系。

### 13.2 packages/core

负责：

- GLB 加载和 assetNodeId 读取。
- 场景节点 BID 初始化与恢复。
- `BidRegistry`。
- 场景图序列化和反序列化。
- `parentBid` 层级重建。
- 删除 tombstone。
- 按 BID 提供渲染和业务 API。
- 全场景 BID 唯一性校验。

### 13.3 packages/scene-editor

负责：

- 拖入资产时创建新的场景实例。
- 创建、删除、复制和换父节点命令。
- Undo/Redo。
- 场景树使用 BID 作为 Key。
- 选中状态使用 BID。
- 拖拽循环检测和层级约束。
- 修改完成后触发场景保存。

## 14. 旧场景和旧资产迁移

## 14.1 旧资产

已有 GLB 没有 `assetNodeId` 时：

1. 固化当前 GLB 内容，计算 `contentHash`。
2. 遍历精确版本的 glTF `nodes[]`。
3. 为节点注入 `assetNodeId`。
4. 保存为新的不可变资产版本。
5. 不允许在同一资产版本 URL 下覆盖为不同节点结构。

节点名称或路径只能用于一次性迁移，不能成为正式身份。

## 14.2 旧场景

当前场景修改以路径为 Key。迁移过程：

1. 使用旧逻辑加载场景和 GLB。
2. 暂时通过旧路径找到节点。
3. 为整棵场景树生成 BID。
4. 将旧路径修改转换为以 BID 为主键的节点记录。
5. 写入 `schemaVersion: 2`。
6. 迁移完成后不再使用旧路径。

如果旧资产 URL 的内容已经发生变化，无法保证路径对应关系，应报告迁移冲突，不能静默绑定到错误节点。

## 15. 异常和数据完整性

加载和保存时应检测以下错误：

- BID 缺失。
- BID 重复。
- `assetNodeId` 缺失。
- 场景引用的资产版本不存在。
- 场景中的 `assetNodeId` 在对应资产版本中不存在。
- `parentBid` 指向不存在的节点。
- 父子关系存在循环。
- 一个节点在节点表中出现多个父节点。
- 同一资产实例内出现重复 `assetNodeId`。

处理建议：

- BID 重复：阻止加载或保存，并明确报告冲突 BID。
- 资产节点缺失：保留场景记录并标记 unresolved，不应绑定到相似名称节点。
- 父节点缺失：临时挂到场景恢复容器，并报告错误。
- 资产版本缺失：显示占位节点，保留 BID 和场景属性。

## 16. 分阶段实施计划

### 阶段一：基础身份

- Asset Manager 为 GLB 注入 `assetNodeId`。
- Core 增加 `generateBid()` 和 `BidRegistry`。
- 模型首次拖入时为整棵树生成 BID。
- 场景树和选中状态改用 BID。

### 阶段二：持久化

- 场景 Schema 升级到 Version 2。
- 保存所有节点 BID、`parentBid` 和 `order`。
- 刷新时通过 `assetNodeId` 恢复 BID。
- 停止将业务 ID 写入 Three.js `uuid`。

### 阶段三：节点编辑

- 增加 Create、Delete、Duplicate、Reparent 命令。
- 支持 GLB 子节点删除 tombstone。
- 支持跨资产树移动节点。
- Undo/Redo 全面使用 BID。

### 阶段四：API 和迁移

- Core API 从 UUID 迁移到 BID。
- 迁移旧资产。
- 迁移旧场景路径修改数据。
- 增加资产版本升级和节点映射机制。

## 17. 最终约束总结

系统必须遵守以下身份规则：

```text
节点首次进入场景：
生成新 BID

同一个模型再次拖入：
整棵树生成另一套新 BID

页面刷新：
通过 assetNodeId 恢复原 BID

节点改名、修改、排序、换父节点：
BID 不变

节点剪切移动：
BID 不变

节点复制：
复制树全部生成新 BID

Undo 恢复：
恢复原 BID

资产节点定位：
使用 assetVersionId + assetNodeId

场景业务定位：
只使用 BID
```

`assetNodeId` 解决“刷新后如何认出 GLB 的原始节点”，`bid` 解决“如何唯一标识场景中的节点实例”。两者职责不同，缺一不可。
