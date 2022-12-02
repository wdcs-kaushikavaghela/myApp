'use strict';

class BaseDao{

    constructor(dbModel){
        this.Model = dbModel;
    }
    save(object){
        return this.Model.create(object);
    }

	findOne(query, projection) {
		return this.Model.findOne(query, projection).exec();
	}

	find(query, projection) {
		return this.Model.find(query, projection).exec();
	}

	findOneAndUpdate(query, update, options) {
		return this.Model.findOneAndUpdate(query, update, options).exec();
	}

	findAndModify(query, update, options) {
		return this.Model.findAndModify(query, update, options).exec();
	}

	customFind(query, projection, limit, condition) {
		return this.Model.find(query, projection).limit(limit).sort(condition).exec();
	}
    update(query, update, options) {
		if (!options) {
			options = {};
		}
		return this.Model.update(query, update, options).exec();
	}
	aggregate(aggPipe) {
		return this.Model.aggregate(aggPipe).exec();
	}

	findByIdAndRemove(query, options) {
		return this.Model.findByIdAndRemove(query, options).exec();
	}
}
module.exports = BaseDao;