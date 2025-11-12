export default function <%= fnObjectName %>Model({ ABModelPlugin }) {

   return class ABModel<%= objectNamePascal %> extends ABModelPlugin {
      constructor(object) {
         super(object);
      }

      ///
      /// Instance Methods
      ///

      /**
       * @method create
       * performs an update operation
       * @param {obj} values
       *    A hash of the new values for this entry.
       * @param {Knex.Transaction?} trx - [optional]
       * @param {ABUtil.reqService} req
       *    The request object associated with the current tenant/request
       * @return {Promise} resolved with the result of the find()
       */
      // eslint-disable-next-line no-unused-vars
      // async create(values, trx = null, condDefaults = null, req = null) {
      // }

      /**
       * @method delete
       * performs a delete operation
       * @param {string} id
       *    the primary key for this update operation.
       * @param {Knex.Transaction?} trx - [optional]
       *
       * @return {Promise} resolved with {int} numRows : the # rows affected
       */
      // eslint-disable-next-line no-unused-vars
      // async delete(id, trx = null, req = null) {
      // }

      /**
       * @method findAll
       * performs a data find with the provided condition.
       * @param {obj} cond
       *    A set of optional conditions to add to the find():
       * @param {obj} conditionDefaults
       *    A hash of default condition values.
       *    conditionDefaults.languageCode {string} the default language of
       *       the multilingual data to return.
       *    conditionDefaults.username {string} the username of the user
       *       we should reference on any user based condition
       * @param {ABUtil.reqService} req
       *    The request object associated with the current tenant/request
       * @return {Promise} resolved with the result of the find()
       */
      // async findAll(cond, conditionDefaults, req) {
      // }

      /**
       * @method findCount
       * performs a data find to get the total Count of a given condition.
       * @param {obj} cond
       *    A set of optional conditions to add to the find():
       * @param {obj} conditionDefaults
       *    A hash of default condition values.
       *    conditionDefaults.languageCode {string} the default language of
       *       the multilingual data to return.
       *    conditionDefaults.username {string} the username of the user
       *       we should reference on any user based condition
       * @param {ABUtil.reqService} req
       *    The request object associated with the current tenant/request
       * @return {Promise} resolved with the result of the find()
       */
      // async findCount(cond, conditionDefaults, req) {
      // }

      /**
       * @method update
       * performs an update operation
       * @param {string} id
       *   the primary key for this update operation.
       * @param {obj} values
       *   A hash of the new values for this entry.
       * @param {Knex.Transaction?} trx - [optional]
       *
       * @return {Promise} resolved with the result of the find()
       */
      // eslint-disable-next-line no-unused-vars
      // async update(id, values, userData, trx = null, req = null) {
      // }

      normalizeData(data) {
         super.normalizeData(data);
      }
   };
}
