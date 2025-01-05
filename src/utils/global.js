export const getNamespace = (baseInfo) => {
  const { currentUser } = baseInfo;
  const teams = currentUser?.teams || [];
  let namespaceArr = [];
  teams.forEach(team => {
    if (team.team_id === currentUser.user_id) {
      namespaceArr.push(team.namespace);
    } else {
      return '';
    }
  });
  return namespaceArr
}