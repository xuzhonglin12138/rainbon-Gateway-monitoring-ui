export const getNamespace = (baseInfo = {}) => {
  const { currentUser = {} } = baseInfo;
  const teams = currentUser?.teams || [];
  let namespaceArr = [];
  teams.forEach(team => {
    if (team.is_team_owner) {
      namespaceArr.push(team.namespace);
    } else {
      return '';
    }
  });
  return namespaceArr
}