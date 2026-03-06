<template>
  <section class="cluster-spec">
    <div class="header">
      <h3 class="title">
        {{ t('ackCn.clusterSpec.title') }}
      </h3>
      <p class="desc">
        {{ t('ackCn.clusterSpec.help') }}
      </p>
    </div>

    <div
      class="cards"
      role="radiogroup"
      :aria-label="t('ackCn.clusterSpec.title')"
    >
      <button
        v-for="opt in normalizedOptions"
        :key="opt.value"
        class="card"
        type="button"
        role="radio"
        :aria-checked="modelValue === opt.value"
        :class="{ selected: modelValue === opt.value, disabled: disabled }"
        :disabled="disabled"
        @click="select(opt.value)"
      >
        <div class="cardTop">
          <div class="cardTitleRow">
            <div class="cardTitle">
              {{ t(opt.label) }}
            </div>
          </div>
          <div
            v-if="opt.pillKey"
            class="pillRow"
          >
            <span class="pill">{{ t(opt.pillKey) }}</span>
          </div>
        </div>
        <div class="cardBody">
          <ul class="features">
            <li
              v-for="(f, idx) in opt.features"
              :key="idx"
              class="feature"
            >
              <span class="featureKey">{{ t(f.key) }}：</span>
              <span class="featureVal">{{ t(f.val) }}</span>
            </li>
          </ul>
        </div>
        <div class="cardFooter">
          <span
            class="link"
            @click.stop="toggleDetails(opt.value)"
          >
            {{ t('ackCn.clusterSpec.viewDetails') }}
            <span
              class="chev"
              :class="{ open: expandedValue === opt.value }"
            >▾</span>
          </span>
          <div
            class="check"
            aria-hidden="true"
          >
            <span
              v-if="modelValue === opt.value"
              class="checkInner"
            >✓</span>
          </div>
        </div>
      </button>
    </div>

    <div class="detailsWrap">
      <div
        v-if="expandedOption"
        class="details"
      >
        <div class="detailsHeader">
          <div class="detailsTitle">
            {{ t('ackCn.clusterSpec.detailsTitle') }}：{{ t(expandedOption.label) }}
          </div>
          <button
            class="closeBtn"
            type="button"
            @click="expandedValue = null"
          >
            {{ t('generic.close') }}
          </button>
        </div>

        <table class="detailsTable">
          <tbody>
            <tr
              v-for="(row, idx) in expandedOption.detailRows"
              :key="idx"
            >
              <th>{{ t(row.key) }}</th>
              <td>{{ t(row.val) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p
        v-if="error"
        class="error"
      >
        {{ error }}
      </p>
    </div>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue';

const props = defineProps({
  modelValue: { type: String, default: '' },
  options:    { type: Array, default: () => [] },
  disabled:   { type: Boolean, default: false },
  error:      { type: String, default: '' },
  intl:       { type: Object, required: true },
});
const emit = defineEmits(['update:modelValue', 'change']);
const expandedValue = ref(null);

// i18n helper
function t(key) {
  if (!key) {
    return '';
  }

  return props.intl ? props.intl(key) : key;
}

function select(v) {
  if (props.disabled) {
    return;
  }
  emit('update:modelValue', v);
  emit('change', v);
}

function toggleDetails(v) {
  expandedValue.value = expandedValue.value === v ? null : v;
}

const normalizedOptions = computed(() => {
  const opts = Array.isArray(props.options) && props.options.length ? props.options : [];

  return opts.map((o) => {
    const isPro = String(o.value).toLowerCase().includes('pro');

    if (isPro) {
      return {
        ...o,
        pillKey:  'ackCn.clusterSpec.pill.production',
        badgeKey: 'ackCn.clusterSpec.badge.recommended',
        features: [
          { key: 'ackCn.clusterSpec.feature.quota', val: 'ackCn.clusterSpec.value.quota.high' },
          { key: 'ackCn.clusterSpec.feature.capability', val: 'ackCn.clusterSpec.value.capability.full' },
          { key: 'ackCn.clusterSpec.feature.support', val: 'ackCn.clusterSpec.value.support.sla' },
        ],
        detailRows: [
          { key: 'ackCn.clusterSpec.detail.scenario', val: 'ackCn.clusterSpec.detailValue.pro.scenario' },
          { key: 'ackCn.clusterSpec.detail.quota', val: 'ackCn.clusterSpec.detailValue.pro.quota' },
          { key: 'ackCn.clusterSpec.detail.capability', val: 'ackCn.clusterSpec.detailValue.pro.capability' },
          { key: 'ackCn.clusterSpec.detail.support', val: 'ackCn.clusterSpec.detailValue.pro.support' },
        ],
      };
    }

    return {
      ...o,
      pillKey:  'ackCn.clusterSpec.pill.devtest',
      badgeKey: '',
      features: [
        { key: 'ackCn.clusterSpec.feature.quota', val: 'ackCn.clusterSpec.value.quota.standard' },
        { key: 'ackCn.clusterSpec.feature.capability', val: 'ackCn.clusterSpec.value.capability.standard' },
        { key: 'ackCn.clusterSpec.feature.support', val: 'ackCn.clusterSpec.value.support.community' },
      ],
      detailRows: [
        { key: 'ackCn.clusterSpec.detail.scenario', val: 'ackCn.clusterSpec.detailValue.standard.scenario' },
        { key: 'ackCn.clusterSpec.detail.quota', val: 'ackCn.clusterSpec.detailValue.standard.quota' },
        { key: 'ackCn.clusterSpec.detail.capability', val: 'ackCn.clusterSpec.detailValue.standard.capability' },
        { key: 'ackCn.clusterSpec.detail.support', val: 'ackCn.clusterSpec.detailValue.standard.support' },
      ],
    };
  });
});

const expandedOption = computed(() => {
  if (!expandedValue.value) {
    return null;
  }

  return normalizedOptions.value.find((x) => x.value === expandedValue.value) || null;
});
</script>

<style scoped>
.cluster-spec {
  padding: 16px;
  background: #fff;
}
.header {
  margin-bottom: 12px;
}
.title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #1f2937;
}
.desc {
  margin: 6px 0 0;
  color: #6b7280;
  line-height: 1.6;
  font-size: 13px;
}
.cards {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-top: 12px;
}
.card {
  text-align: left;
  padding: 0;
  border: 1px solid #e6e8ee;
  border-radius: 12px;
  background: #fff;
  cursor: pointer;
  overflow: hidden;
  transition: box-shadow 0.15s ease, border-color 0.15s ease, opacity 0.15s ease;
  display: flex;
}
.card:hover {
  box-shadow: 0 6px 18px rgba(16, 24, 40, 0.08);
  border-color: #d5d9e3;
}
.card.selected {
  border-color: var(--active-nav, var(--primary-hover-bg));;
  box-shadow: 0 8px 22px rgba(47, 111, 237, 0.16);
}
.card.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.card.disabled:hover {
  box-shadow: none;
  border-color: #e6e8ee;
}
.cardTop {
  position: relative;
  padding: 16px 24px 12px;
  background: linear-gradient(180deg, rgba(75, 254, 9, 0.07), rgba(47, 237, 174, 0));
}
.cardTitleRow {
  display: flex;
  align-items: center;
  gap: 10px;
}
.cardTitle {
  font-size: 20px;
  font-weight: 800;
  color: #111827;
}
.badge {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 999px;
  background: #f4e7cf;
  color: #7a4b00;
  border: 1px solid #f0d9ad;
}
.pillRow {
  margin-top: 8px;
}
.pill {
  display: inline-flex;
  font-size: 12px;
  padding: 5px 10px;
  border-radius: 999px;
  background: var(--active-nav, var(--primary-hover-bg));
  color: #fff;
}
.check {
  position: absolute;
  top: 18px;
  right: 14px;
  width: 26px;
  height: 26px;
  border-radius: 999px;
  border: 1px solid #d5d9e3;
  display: grid;
  place-items: center;
  background: #fff;
}
.card.selected .check {
  border-color: var(--active-nav, var(--primary-hover-bg));;
  background: var(--active-nav, var(--primary-hover-bg));;
}
.checkInner {
  color: #fff;
  font-weight: 900;
  line-height: 1;
}
.cardBody {
  flex: 1;
  padding: 12px 16px 8px;
}
.features {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 10px;
}
.feature {
  display: flex;
  gap: 6px;
  color: #374151;
  font-size: 13px;
}
.featureKey {
  color: #6b7280;
}
.cardFooter {
  flex: 1;
  position: relative;
  padding: 10px 16px 14px;
}
.link {
  color: var(--active-nav, var(--primary-hover-bg));
  font-weight: 600;
  font-size: 13px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  user-select: none;
}
.chev {
  display: inline-block;
  transition: transform 0.15s ease;
}
.chev.open {
  transform: rotate(180deg);
}
.detailsWrap {
  margin-top: 12px;
}
.details {
  border: 1px solid #e6e8ee;
  border-radius: 12px;
  padding: 12px;
}
.detailsHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}
.detailsTitle {
  font-weight: 800;
  color: #111827;
}
.closeBtn {
  border: 1px solid #d5d9e3;
  background: #fff;
  border-radius: 10px;
  padding: 0px 10px;
  cursor: pointer;
}
.closeBtn:hover {
  border-color: #bfc6d6;
}
.detailsTable {
  width: 100%;
  border-collapse: collapse;
}
.detailsTable th,
.detailsTable td {
  text-align: left;
  padding: 10px 8px;
  font-size: 13px;
  border-top: 1px solid #eef0f5;
}
.detailsTable th {
  width: 140px;
  color: #6b7280;
  font-weight: 600;
}
.error {
  margin-top: 10px;
  color: #b42318;
  font-size: 12px;
}
</style>
