<template lang="pug">
.form-field-entity-view(v-if="entityMeta && viewType")
	.d-flex.justify-content-center.py-5(v-if="initialLoading")
		.spinner.spinner-grow.text-primary
	.d-flex.flex-column.flex-grow-1(v-else-if="viewComponent && entityView")
		.flex-grow-0.flex-shrink-0
			.d-flex.align-items-center.px-3
				.d-flex.align-items-center.my-2.me-2(v-if="store.hasPagination && realPerPageOptions.length && store.total > 0")
					span {{ trans('itemsPerPage') }}:
					field-select.mx-2(
						required
						:model-value="store.perPage"
						:options="realPerPageOptions"
						:disabled="store.loading"
						@update:model-value="updatePerPage($event)"
					)
					span {{ trans('of') }} {{ store.total }}
				slot(name="top-end")
			.px-1.my-2.position-relative.d-flex.flex-wrap(v-if="entityView.filters && entityView.filters.length" style="z-index:6")
				template(v-for="(filter, i) in entityView.filters")
					component.flex-grow-1.px-1(
						v-if="filter.type && filter.key"
						:key="filter.key"
						:is="getFieldComponent(filter.type)"
						v-bind="filter.props"
						:model-value="queryParams.filters?.[filter.key]"
						:autofocus="isActivated && i === 0"
						:context="context"
						@update:model-value="updateFilterItem(filter.key, $event)"
					)
						template(#label)
							span(v-html="filter.label")
		.fs-5.semibold.text-center.text-muted.px-3.py-4(v-if="store.total === 0") {{ store.loading ? (loadingText || `${trans('loading')}...`) : (emptyText || trans('noItems')) }}
		.flex-shrink-1(v-else)
			component(
				:is="viewComponent"
				:selectable="selectable"
				:sortable="sortable"
				:context="context"
				v-bind="{ ...entityView.props, ...viewProps }"
				:items="store.items"
				:loading="store.loading"
				:loading-items="store.loadingItems"
				:no-actions="noActions"
				@item-click="onItemClick($event)"
				@item-input="onItemInput($event)"
				@item-action-click="onItemActionClick($event)"
			)
				template(#view-display="{ item }")
					slot(name="view-display" v-bind="getItemSlotBindings(item)")
				template(#item-before="{ item }")
					slot(name="item-before" v-bind="getItemSlotBindings(item)")
				template(#item-after="{ item }")
					slot(name="item-after" v-bind="getItemSlotBindings(item)")
				template(#selection="{ item }")
					slot(name="selection" v-bind="getItemSlotBindings(item)")
				template(#actions="{ item }")
					.d-flex.justify-content-end
						.btn-group.btn-group-sm
							slot(name="actions-before" v-bind="getItemSlotBindings(item)")
							slot(name="actions" v-bind="getItemSlotBindings(item)")
								a.btn.btn-primary(v-if="store.abilities.update" @click.prevent="onEditClick(item)" :href="itemRoute(item)")
									i.fas.fa-pencil
								button.btn.btn-danger(v-if="store.abilities.delete" @click.prevent="confirmAndDestroy(item)")
									i.fas.fa-trash
							slot(name="actions-after" v-bind="getItemSlotBindings(item)")
			.p-3(v-if="store.lastPage > 1 && store.hasPagination")
				page-nav(
					:model-value="store.page"
					:last-page="store.lastPage"
					:loading="store.loading"
					:total="store.total"
					:limit="store.perPage"
					@update:model-value="updatePage($event)"
				)
</template>

<script lang="ts">
import type { PropType } from 'vue';
import { onDeactivated, onActivated, defineComponent, computed, watch, ref } from 'vue';
import { useRouter } from 'vue-router';
import type { IRegisteredEntity, IView } from '.';
import EntityManager from '.';
import type { ListItem } from './stores/list';
import EntityListStore from './stores/list';
import { get, create, debounce, useTranslator, useOptionalSyncProp } from '../vue-composition-utils';
import PageNav from '../pagination/page-nav.vue';
import FieldSelect from '../form/fields/select.vue';
import ModalDialog from '../modal/dialogs';
import NotificationManager from '../notification';
import FormFields from '../form/fields';

function isPositionChangeEvent(event: { action: string }): event is { action: string; oldIndex: number; newIndex: number } {
	return event.action === 'itemPositionChange';
}

export interface IApiQuery {
	page?: number;
	perPage?: number;
	filters?: Record<string, unknown>;
	sort?: string[];
}

export default defineComponent({
	components: { PageNav, FieldSelect },
	props: {
		entityMeta: {
			type: Object as PropType<IRegisteredEntity | null>,
			default: null,
		},
		view: {
			type: String,
			default: '',
		},
		viewProps: {
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
		sortable: {
			type: Boolean,
			default: false,
		},
		query: {
			type: Object as PropType<IApiQuery | null>,
			default: null,
		},
		staticFilters: {
			type: Object as PropType<Record<string, unknown> | null>,
			default: null,
		},
		perPage: {
			type: Number,
			default: 0,
		},
		perPageOptions: {
			type: Array as PropType<number[] | null>,
			default: null,
		},
		loadingText: {
			type: String,
			default: '',
		},
		emptyText: {
			type: String,
			default: '',
		},
		sharedStore: {
			type: Object as PropType<EntityListStore>,
			default: null,
		},
		context: {
			type: Object as PropType<Record<string, unknown> | null>,
			default: null,
		},
	},
	emits: ['update:query', 'edit-click', 'item-click', 'item-action-click'],
	setup(props, { emit, expose }) {
		const store = props.sharedStore || create(EntityListStore);
		const entityManager = get(EntityManager);
		const formFields = get(FormFields);
		const notifier = get(NotificationManager);
		const modalDialog = get(ModalDialog);
		const { trans } = useTranslator();
		const router = useRouter();
		const entityView = computed(() => {
			if (!props.entityMeta) {
				return null;
			}
			const { views } = props.entityMeta;
			const view: Required<IView> = (props.view ? views[props.view] : views[Object.keys(views)[0]]) || null;
			return view;
		});
		const viewType = computed(() => entityView.value && entityManager.getViewType(entityView.value.type));
		// TODO skeleton and not found state
		const viewComponent = computed(() => viewType.value?.component || null);
		const realPerPageOptions = computed(() => props.perPageOptions || entityView.value?.perPageOptions || []);
		const initialLoading = ref(false);
		const isActivated = ref(false);
		const queryParams = useOptionalSyncProp<IApiQuery>(
			() => props.query,
			(v) => emit('update:query', v),
			{},
		);
		const reload = (): Promise<void> =>
			store.reload({
				...queryParams.value,
				include: entityView.value?.include,
				query: entityView.value?.query,
				perPage: queryParams.value.perPage || props.perPage || entityView.value?.perPage,
			});
		const reloadInitialState = async (): Promise<void> => {
			if (store.loading || !entityView.value) {
				return;
			}
			initialLoading.value = true;
			store.setEntity(props.entityMeta);
			store.setStaticFilters({ ...entityView.value.staticFilters, ...props.staticFilters });
			await reload();
			initialLoading.value = false;
		};
		const itemRoute = (item: ListItem): string =>
			props.entityMeta
				? router.resolve({
						name: 'entityItem',
						params: {
							entity: props.entityMeta.slug,
							id: `${item[props.entityMeta.itemUrlKey]}`,
						},
				  }).href
				: '#';
		function onEditClick(item: ListItem): void {
			if (!props.entityMeta) {
				return;
			}
			emit('edit-click', { item, id: `${item[props.entityMeta.itemUrlKey]}` });
		}
		async function confirmAndDestroy(item: ListItem) {
			const confirmed = await modalDialog.confirm(`${trans('areYouSure')}?`, trans('deleteItem'));
			if (!confirmed) {
				return;
			}
			try {
				await store.deleteItem(item);
				reload();
			} catch (err) {
				notifier.push({
					type: 'error',
					body: `${err}`,
				});
			}
		}

		watch([() => props.entityMeta, () => props.staticFilters], () => reloadInitialState());
		watch(entityView, () => {
			if (store.perPage !== entityView.value?.perPage && !(entityView.value?.perPageOptions || props.perPageOptions)?.includes(store.perPage)) {
				reloadInitialState();
			}
		});
		watch(queryParams, () => reload());
		onActivated(() => {
			isActivated.value = true;
		});
		onDeactivated(() => {
			isActivated.value = false;
		});
		reloadInitialState();

		expose({ reload });
		return {
			viewType,
			viewComponent,
			entityView,
			initialLoading,
			store,
			realPerPageOptions,
			isActivated,
			queryParams,
			trans,
			onEditClick,
			itemRoute,
			confirmAndDestroy,
			updatePage(page: number): void {
				queryParams.value = {
					...queryParams.value,
					page,
				};
			},
			updatePerPage(perPage: number): void {
				queryParams.value = {
					perPage,
					filters: queryParams.value.filters,
					sort: queryParams.value.sort,
				};
			},
			updateFilterItem: debounce((key: string | undefined, value: unknown) => {
				if (!key) {
					return;
				}
				const filters: Record<string, unknown> = { ...queryParams.value.filters };
				if (value == null || value === '') {
					delete filters[key];
				} else {
					filters[key] = value;
				}
				queryParams.value = {
					filters,
					sort: queryParams.value.sort,
					perPage: queryParams.value.perPage,
				};
			}),
			onItemClick(item: ListItem): void {
				if (!props.entityMeta) {
					return;
				}
				emit('item-click', { item, id: `${item[props.entityMeta.itemUrlKey]}`, abilities: store.abilities });
			},
			onItemActionClick(event: { action: string; item: ListItem; [otherArgs: string]: unknown }): void {
				if (!props.entityMeta) {
					return;
				}
				if (isPositionChangeEvent(event)) {
					store.moveItem(event.oldIndex, event.newIndex);
				} else {
					emit('item-action-click', { ...event, id: `${event.item[props.entityMeta.itemUrlKey]}`, abilities: store.abilities });
				}
			},
			onItemInput({ item, values }: { item: Record<string, unknown>; values: Record<string, unknown> }) {
				store.patchItem(item, values).catch((err) => {
					notifier.push({
						type: 'error',
						body: `${err}`,
					});
				});
			},
			getFieldComponent(type: string) {
				return formFields.getComponent(type);
			},
			getItemSlotBindings(item: ListItem) {
				return {
					item,
					id: (props.entityMeta && item[props.entityMeta.itemUrlKey]) || '',
					itemRoute: itemRoute(item),
					reload,
					onEditClick: () => onEditClick(item),
					confirmAndDestroy: () => confirmAndDestroy(item),
				};
			},
			reload,
		};
	},
});
</script>

<style lang="stylus" scoped>
.spinner
	width 9.5rem
	height @width
</style>
