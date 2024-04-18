<template lang="pug">
mixin prevLink
	li.page-item(v-if="modelValue > 1")
		a.page-link(
			@click.prevent="change(modelValue - 1)"
			:href="getUrlForPage(modelValue - 1)"
		) &laquo;
	li.page-item.disabled(v-else)
		span.page-link &laquo;
mixin nextLink
	li.page-item(v-if="modelValue < lastPage")
		a.page-link(
			@click.prevent="change(modelValue + 1)"
			:href="getUrlForPage(modelValue + 1)"
		) &raquo;
	li.page-item.disabled(v-else)
		span.page-link &raquo;
nav.pagination-wrapper(:class="{ loading }" v-if="lastPage > 1 || total")
	template(v-if="lastPage > 1")
		.d-none.d-sm-block: ul.pagination.pagination-sm.m-0
			+prevLink
			template(v-for="i in pageLinks")
				li.page-item.disabled(v-if="i === DOTS")
					span.page-link ...
				li.page-item(v-else :class="{ active: modelValue === i }")
					span.page-link(v-if="i === modelValue" :class="{ loading }")
						span.page-link-text {{ i }}
						.spinner.spinner-border.spinner-border-sm
					a.page-link(v-else @click.prevent="change(i)" :href="getUrlForPage(i)") {{ i }}
			+nextLink
		.d-sm-none: ul.pagination.m-0
			+prevLink
			li.page-item.disabled
				span.page-link(:class="{ loading }")
					span.page-link-text {{ modelValue }} / {{ lastPage }}
					.spinner.spinner-grow.spinner-grow-sm
			+nextLink
	.bg-primary.text-light.px-2.rounded(v-if="total > 0 && lastPage > 1")
		| {{ trans('itemsOnPage') }}
		!=': '
		span {{ firstItemNum === lastItemNum ? firstItemNum : `${firstItemNum}-${lastItemNum}` }} / {{ total }}
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useTranslator } from '../vue-composition-utils';
import { DOTS, getPageLinks, getPageUrlGenerator } from './utils';

export default defineComponent({
	props: {
		modelValue: {
			type: Number,
			required: true,
		},
		lastPage: {
			type: Number,
			required: true,
		},
		loading: {
			type: Boolean,
			default: false,
		},
		total: {
			type: Number,
			default: 0,
		},
		limit: {
			type: Number,
			default: 0,
		},
	},
	emits: ['update:modelValue', 'change'],
	setup(props, { emit }) {
		const route = useRoute();
		const getUrlForPage = computed(() => getPageUrlGenerator(route?.fullPath || ''));
		return {
			...useTranslator(),
			DOTS,
			getUrlForPage,
			change(page: number) {
				emit('change', { page, href: getUrlForPage.value(page) });
				emit('update:modelValue', page);
			},
			firstItemNum: computed(() => props.limit * (props.modelValue - 1) + 1),
			lastItemNum: computed(() => (props.modelValue === props.lastPage ? props.total : props.limit * props.modelValue)),
			pageLinks: computed(() => getPageLinks(props.lastPage, props.modelValue)),
		};
	},
});
</script>

<style scoped lang="stylus">
.pagination-wrapper
	display flex
	align-items center
	justify-content space-between
.page-link
	position relative
	&.loading .page-link-text
		color transparent
	&:not(.loading)
		.spinner
			display none
	.spinner
		position absolute
		top 0
		right 0
		bottom 0
		left 0
		margin auto
</style>
