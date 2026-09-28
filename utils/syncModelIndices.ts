import { EnrollmentModel } from './../model/enrollment.model';
import { ModuleModel } from './../model/module.model';
import { CourseModel } from './../model/course.model';
import { UserModel } from '../model/user.model.ts';
import { ProgressModel } from '../model/progress.model.ts';
import { SessionModel } from '../model/session.model.ts';

export const syncModelIndices = async () => {
    try {
        await UserModel.syncIndexes();
        await CourseModel.syncIndexes();
        await ModuleModel.syncIndexes();
        await EnrollmentModel.syncIndexes();
        await ProgressModel.syncIndexes();
        await SessionModel.syncIndexes();
        console.log("Mongoose models synced!");
    }
    catch (err) {
        console.log("Error syncing indices: ", err);
        throw new Error("From syncModelIndices: ", { cause: "Error syncing indices" });
    }
};