<template lang="pug">
.content(v-if="currentLevelItems.length" :class="{ loading, root: !parentId }")
	draggable-group.form-field-array-items(
		handle="[data-move-handle]"
		tag="transition-group"
		:animation="200"
		:component-data="{ tag: 'div' }"
		:item-key="itemKey"
		:model-value="currentLevelItems"
		:disabled="!sortable"
		@change="onDragAndDrop($event)"
	)
		template(#item="{ element: item, index }")
			.tree-view-item-wrap(:class="{ loading: loadingItems.has(item) }")
				.tree-view-item-data
					.tree-view-item.d-flex.align-items-center.rounded.shadow-sm.border.border-light
						.ps-1(v-if="sortable")
							button.btn.btn-light.btn-sm.drag-action(
								@click.prevent
								data-move-handle
								:disabled="currentLevelItems.length < 2"
							)
								i.fas.fa-arrows-alt-v
						.ps-1(v-if="selectable")
							slot(name="selection" :item="item")
						.item-display.flex-grow-1.px-2.py-1(@click.prevent="onItemClick(item)")
							slot(name="view-display" v-bind="{ item, displayType, displayProps }")
								component(:is="displayComponent" v-bind="{ ...displayProps, item, index }")
						template(v-if="!noActions")
							.p-1(v-if="componentDepthLevel < maxLevel")
								button.btn.btn-sm.btn-outline-primary(type="button" @click="onCreateChildClick(item)")
									i.fas.fa-plus
									!=' '
									| {{ createChildButtonText }}
							.p-1
								slot(name="actions" :item="item")
				tree-view.ps-4(
					v-bind="props"
					:component-depth-level="componentDepthLevel + 1"
					:parent-id="getParentId(item)"
					:loading="false"
					@item-click="onItemClick($event)"
					@item-action-click="onItemActionClick($event)"
				)
					template(
						v-for="(_, slot) of slots"
						#[slot]=`// @ts-ignore
							scope`
					)
						slot(:name="slot" v-bind="scope")
</template>

<script lang="ts">
import type { PropType } from 'vue';
import { defineComponent, computed } from 'vue';
import DraggableGroup, { useDragAndDrop } from '../../drag-and-drop';
import EntityManager from '..';
import { get } from '../../vue-composition-utils';

function deep(obj: Record<string, unknown>, path: string[]): unknown {
	let current = obj;
	for (const prop of path) {
		current = current[prop] as Record<string, unknown>;
		if (current == null || typeof current !== 'object') {
			break;
		}
	}
	return current;
}

export default defineComponent({
	name: 'TreeView',
	components: { DraggableGroup },
	props: {
		items: {
			type: Array as PropType<Record<string, unknown>[]>,
			required: true,
		},
		loading: {
			type: Boolean,
			default: false,
		},
		loadingItems: {
			type: Object as PropType<Set<unknown>>,
			default: () => new Set(),
		},
		displayType: {
			type: String,
			default: 'text',
		},
		displayProps: {
			type: Object,
			default: null,
		},
		noActions: {
			type: Boolean,
			default: false,
		},
		selectable: {
			type: Boolean,
			default: false,
		},
		itemKey: {
			type: String,
			default: 'id',
		},
		itemForeign: {
			type: [Array, String] as PropType<string | string[]>,
			default: 'parent.id',
		},
		parentId: {
			type: [String, Number] as PropType<string | number>,
			default: null,
		},
		maxLevel: {
			type: Number,
			default: 0,
		},
		createChildButtonText: {
			type: String,
			default: '',
		},
		// for internal usage only!
		componentDepthLevel: {
			type: Number,
			default: 1,
		},
		sortable: {
			type: Boolean,
			default: false,
		},
		context: {
			type: Object,
			default: null,
		},
	},
	emits: ['item-click', 'item-action-click'],
	setup(props, { emit, slots }) {
		const entityManager = get(EntityManager);
		const foreignPath = computed<string[]>(() => (Array.isArray(props.itemForeign) ? props.itemForeign : props.itemForeign.split('.')));
		const currentLevelItems = computed(() =>
			props.parentId
				? // with parent
				  props.items.filter((item) => deep(item, foreignPath.value) === props.parentId)
				: // roots
				  props.items.filter((item) => !deep(item, foreignPath.value)),
		);

		return {
			...useDragAndDrop((oldIndex: number, newIndex: number) => {
				const realOldIndex = props.items.indexOf(currentLevelItems.value[oldIndex]);
				const realNewIndex = props.items.indexOf(currentLevelItems.value[newIndex]);
				if (realOldIndex === -1 || realNewIndex === -1) {
					return;
				}
				emit('item-action-click', {
					action: 'itemPositionChange',
					oldIndex: realOldIndex,
					newIndex: realNewIndex,
				});
			}),
			slots,
			props,
			currentLevelItems,
			displayComponent: computed(() => entityManager.getDisplayType(props.displayType)?.component),
			onItemClick(item: Record<string, unknown>) {
				emit('item-click', item);
			},
			getParentId(item: Record<string, unknown>) {
				return item[props.itemKey] as string | number;
			},
			onCreateChildClick(item: Record<string, unknown>) {
				emit('item-action-click', { action: 'createChild', item });
			},
			onItemActionClick(event: unknown) {
				emit('item-action-click', event);
			},
		};
	},
});
</script>

<style lang="stylus" scoped>
.content
	position relative
.root
	padding 0 0.5rem
	&.loading::before
		content ''
		display block
		position absolute
		top -0.5rem
		right 0
		bottom @top
		left @right
		opacity 0.8
		background white
		z-index 5
	::v-deep(.sortable-ghost)
		opacity 0.8
		animation tree-view-item-moving-pulse 1s infinite
.tree-view-item-data
	margin-bottom 0.5rem
.tree-view-item
	background white
	position relative
	z-index 1
	cursor pointer
	&:hover
		background var(--bs-light)
.tree-view-item-wrap
	&.loading
		opacity 0.2
.content:not(.root) > .form-field-array-items > .tree-view-item-wrap
	position relative
	&:before
		content ''
		display block
		color var(--bs-gray-400)
		border-bottom 2px solid
		border-left 2px solid
		border-bottom-left-radius 0.25rem
		position absolute
		bottom 50%
		right 100%
		width 0.75rem
		height calc(100% + 0.75rem + 2px)
		margin-bottom -2px
		pointer-events none
@keyframes tree-view-item-moving-pulse
	0%
		opacity 0.8
	50%
		opacity 0.4
</style>
