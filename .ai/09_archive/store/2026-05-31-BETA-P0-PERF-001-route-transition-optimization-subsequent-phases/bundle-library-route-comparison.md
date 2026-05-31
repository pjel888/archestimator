# /workshop/library Route Bundle Comparison

| Build | Initial JS chunks | Initial JS bytes |
|---|---:|---:|
| HEAD baseline | 11 | 618452 |
| Current route-transition branch | 6 | 231552 |

Delta: -386900 bytes (-62.6%).

Interpretation: negative delta is a reduction in initial JS listed for `[project]/src/app/workshop/library/page` in the Next.js client reference manifest.

Current build also emits separate SSR chunks for:
- 10h7_workshop_component-library-manager_ComponentLibraryManager_tsx_0_q7sam._.js: 19753 bytes
- src_components_workshop_component-library-manager_AddComponentModal_tsx_0lyvm75._.js: 61857 bytes
- src_components_workshop_component-library-manager_LibraryFolderTree_tsx_0jxs7ih._.js: 19989 bytes

Artifacts:
- `bundle-baseline-head-library-route-manifest.json`
- `bundle-current-library-route-manifest.json`
- `bundle-baseline-head-build-for-manifest.txt`
- `build-after-library-folder-tree-dynamic.txt`
