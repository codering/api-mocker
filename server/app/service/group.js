const { authority } = require('../../constants')
const {
  PRIVACY_ALL,
  PRIVACY_MEMBER,
  PRIVACY_SELF,
  OPERATION_ALL,
  OPERATION_MEMBER
} = authority

module.exports = app => {
  class Group extends app.Service {
    isWritable (group, authId) {
      switch (group.operation) {
        case OPERATION_ALL:
          return { status: true }
        case OPERATION_MEMBER:
          return {
            status: !!group.member.find(m => m.toString() === authId),
            msg: '仅组内成员可操作'
          }
        default:
          return { status: true }
      }
    }
    getReadableGroups () {
      const authId = this.ctx.authUser._id
      const cond = {
        isDeleted: false,
        $or: [{
          privacy: null
        }, {
          privacy: PRIVACY_ALL
        }, {
          privacy: PRIVACY_MEMBER,
          member: authId
        }, {
          privacy: PRIVACY_SELF,
          manager: authId
        }]
      }
      return app.model.Group.find(cond).sort({ modifiedTime: -1, createTime: -1 })
    }
    update (groupId, group) {
      return app.model.Group.findOneAndUpdate({
        _id: groupId,
        manager: this.ctx.authUser._id
      }, Object.assign(group, { modifiedTime: Date.now() }), { new: true })
    }
    updateTime (groupId) {
      // 此方法允许异步执行
      return app.model.Group.update({ _id: groupId }, { modifiedTime: Date.now() }, { new: true }).exec()
    }
    create (group) {
      const authId = this.ctx.authUser._id
      const _group = {
        name: group.name,
        creator: authId,
        manager: authId
      }
      return app.model.Group(_group).save()
    }
    getUserGroups (user, rights) {
      return app.model.Group.find({
        [rights]: user,
        isDeleted: false
      }).sort({
        createTime: -1
      })
    }
    getById (groupId) {
      return app.model.Group.findOne({
        _id: groupId
      })
    }
    * delete (groupId) {
      const group = yield this.getById(groupId)
      return app.model.Group.findOneAndUpdate({
        _id: groupId,
        manager: this.ctx.authUser._id
      }, {
        modifiedTime: Date.now(),
        name: `${group.name}_已删除_${group._id}`,
        isDeleted: true
      })
    }
    getManageGroup () {
      return this.getUserGroups(this.ctx.authUser._id, 'manager')
    }
    getUnmanaged () {
      return this.getUserGroups(null, 'manager')
    }
    claim (groupId) {
      return app.model.Group.findOneAndUpdate({
        _id: groupId,
        manager: null
      }, {
        modifiedTime: Date.now(),
        manager: this.ctx.authUser._id
      })
    }
  }
  return Group
}
