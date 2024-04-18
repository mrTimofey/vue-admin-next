<template lang="pug">
.form-field-integer
	slot(name="label")
	input.form-control.form-control-sm(
		:disabled="disabled"
		:placeholder="placeholder"
		:value="modelValue"
		:class="{ 'is-invalid': !!errors }"
		@input="onInput($event)"
		@blur="onBlur()"
	)
	.invalid-feedback(v-if="errors && errors.length")
		div(v-for="err in errors") {{ err }}
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { getCommonProps } from './common';

export default defineComponent({
	props: {
		...getCommonProps({
			type: [Number, String],
			default: null,
		}),
		min: {
			type: Number,
			default: -Infinity,
		},
		max: {
			type: Number,
			default: Infinity,
		},
	},
	emits: ['update:modelValue'],
	setup(props, { emit }) {
		return {
			onInput(e: Event) {
				const target = e.target as HTMLInputElement;
				const real = target.value;
				const v = real.replace(/(?!^-)[^0-9]/g, '');
				if (v !== real) {
					target.value = v;
				}
				if (v !== '-') {
					const newValue = v === '' ? null : Number(v);
					if (props.modelValue !== newValue) {
						emit('update:modelValue', newValue);
					}
				}
			},
			onBlur() {
				if (props.modelValue === null) {
					return;
				}
				const numeric = Number(props.modelValue);
				if (Number.isNaN(numeric)) {
					return;
				}
				if (numeric < props.min) {
					emit('update:modelValue', props.min);
				} else if (numeric > props.max) {
					emit('update:modelValue', props.max);
				}
			},
		};
	},
});
</script>
