export default {
  setExistedFlatnetworkSubnet(state, val) {
    state.existedFlatnetworkSubnet = val;
  },
  clearExistedFlatnetworkSubnet(state) {
    state.existedFlatnetworkSubnet = [];
  },
  setFlatnetworkIpList(state, val) {
    state.flatnetworkIpList = val;
  },
  addFlatnetworkIpListt(state, val) {
    state.flatnetworkIpList = state.flatnetworkIpList.concat(val);
  },
};
