import { State, Action, StateContext, Selector } from '@ngxs/store';
import {
  AddEmptyCourseToModule,
  AddModuleToSemester,
  DeleteCourse,
  DeleteModule,
  DeleteSemesterById,
  EditFieldCourse,
  EditModuleName,
  EditSemesterName,
  MaquetteAction,
  MaquetteFetch,
  MaquetteDelete,
  AddNewSemesterToYear,
  EditExtraNameById,
  DeleteExtraById,
  AddNewExtraToYear,
  EditExtraItemField,
  AddExtraEmptyToModule,
  DeleteExtraItem,
  MaquetteNewYear,
  MarkAsDirty,
  LockOrUnlock,
  SaveMaquetteById,
  NewMaquette,
  SaveNewMaquette,
} from './maquette.actions';
import {
  Course,
  ExtraModules,
  ItemExtra,
  Maquette,
  MaquetteHelpers,
  Module,
  ModuleHelpers,
  Semester,
  SemesterHelpers,
  Year,
  YearHelpers,
} from '../types';
import { v4 as uuid } from 'uuid';
import { MaquetteService } from '../services/maquette.service';
import { switchMap, tap } from 'rxjs/operators';
import { patch, updateItem, removeItem, insertItem } from '@ngxs/store/operators';
import { ImmutableContext } from '@ngxs-labs/immer-adapter';
import * as _ from 'lodash';
import { Navigate } from '@ngxs/router-plugin';

export class MaquetteStateModel {
  public items: Maquette[];
  public dirtyIds: string[];
}

const reduceChain = (inArray: any[], keys: string[]) =>
  keys.reduce(
    (prev, curr) => prev.reduce((prev2, curr2) => [...prev2, ...(_.get(curr2, curr) || [])], []),
    inArray,
  );

@State<MaquetteStateModel>({
  name: 'maquette',
  defaults: {
    items: [],
    dirtyIds: [],
  },
})
export class MaquetteState {
  @Selector()
  static all(state: MaquetteStateModel): Maquette[] {
    return state.items;
  }

  @Selector()
  static byId(state: MaquetteStateModel): (id: string) => Maquette {
    return (id: string) => state.items.find(val => val._id === id);
  }

  @Selector()
  static newMaquette(state: MaquetteStateModel): Maquette {
    return MaquetteState.byId(state)('new');
  }

  @Selector()
  static dirtyById(state: MaquetteStateModel): (id: string) => boolean {
    return (id: string) => {
      return state.dirtyIds.includes(id);
    };
  }

  constructor(private readonly maquetteService: MaquetteService) {}

  @Action(MaquetteFetch)
  fetchAll(ctx: StateContext<MaquetteStateModel>) {
    return this.maquetteService.getAll().pipe(tap(val => ctx.setState(patch({ items: val }))));
  }

  @Action(MaquetteDelete)
  deleteById(ctx: StateContext<MaquetteStateModel>, { maquetteId }: MaquetteDelete) {
    return this.maquetteService.deleteById(maquetteId).pipe(
      tap(() =>
        ctx.setState(
          patch({
            items: removeItem(maquette => maquette.id === maquetteId),
          }),
        ),
      ),
    );
  }

  @Action(EditModuleName)
  @ImmutableContext()
  public updateModuleName(
    ctx: StateContext<MaquetteStateModel>,
    { moduleId, value }: EditModuleName,
  ) {
    ctx.setState((state: MaquetteStateModel) => {
      reduceChain(state.items, ['years', 'semesters', 'modules']).find(
        module => module.id === moduleId,
      ).name = value;

      return state;
    });
  }

  @Action(EditSemesterName)
  @ImmutableContext()
  public updateSemester(
    ctx: StateContext<MaquetteStateModel>,
    { semesterId, value }: EditSemesterName,
  ) {
    ctx.setState((state: MaquetteStateModel) => {
      reduceChain(state.items, ['years', 'semesters']).find(
        semester => semester.id === semesterId,
      ).name = value;

      return state;
    });
  }

  @Action(EditExtraNameById)
  @ImmutableContext()
  public updateExtraName(
    ctx: StateContext<MaquetteStateModel>,
    { name, extraId }: EditExtraNameById,
  ) {
    ctx.setState((state: MaquetteStateModel) => {
      const extra = this.findExtraModule(extraId, state);
      extra.name = name;
      return state;
    });
  }

  @Action(DeleteExtraById)
  @ImmutableContext()
  public deleteExtraGroup(ctx: StateContext<MaquetteStateModel>, { extraId }: DeleteExtraById) {
    ctx.setState((state: MaquetteStateModel) => {
      const yer: Year = reduceChain(state.items, ['years']).find(
        (year: Year) => !!year.extras.find(extra => extra.id === extraId),
      );
      yer.extras = yer.extras.filter(val => val.id !== extraId);
      return state;
    });
  }

  @Action(AddNewExtraToYear)
  @ImmutableContext()
  public addNewExtraToYear(ctx: StateContext<MaquetteStateModel>, { yearId }: AddNewExtraToYear) {
    ctx.setState((state: MaquetteStateModel) => {
      const year = this.findYearById(yearId, state);
      const id = uuid();
      const newExtra: ExtraModules = {
        _id: id,
        id,
        items: [],
        name: '',
      };
      year.extras = [...year.extras, newExtra];
      return state;
    });
  }

  @Action(AddExtraEmptyToModule)
  @ImmutableContext()
  public addExtraEmptyToModule(
    ctx: StateContext<MaquetteStateModel>,
    { extraId }: AddExtraEmptyToModule,
  ) {
    ctx.setState((state: MaquetteStateModel) => {
      const id = uuid();
      const newExtraItem: ItemExtra = {
        _id: id,
        id,
        hour: 0,
        name: '',
        date: '',
      };
      this.findExtraModule(extraId, state).items.push(newExtraItem);

      return state;
    });
  }

  @Action(DeleteExtraItem)
  @ImmutableContext()
  public deleteExtraItem(
    ctx: StateContext<MaquetteStateModel>,
    { itemId, groupId }: DeleteExtraItem,
  ) {
    ctx.setState((state: MaquetteStateModel) => {
      const group = this.findExtraModule(groupId, state);
      group.items = group.items.filter(val => val.id !== itemId);
      return state;
    });
  }

  @Action(EditExtraItemField)
  @ImmutableContext()
  public editFieldItemExtra(
    ctx: StateContext<MaquetteStateModel>,
    { field, value, itemId }: EditExtraItemField,
  ) {
    ctx.setState((state: MaquetteStateModel) => {
      this.findExtraModuleItem(itemId, state)[field] = value;
      return state;
    });
  }

  @Action(EditFieldCourse)
  @ImmutableContext()
  public toto(ctx: StateContext<MaquetteStateModel>, { courseId, field, value }: EditFieldCourse) {
    ctx.setState((state: MaquetteStateModel) => {
      reduceChain(state.items, ['years', 'semesters', 'modules', 'courses']).find(
        val => val.id === courseId,
      )[field] = value;
      const id = state.items.find(maquette => MaquetteHelpers.hasCourse(maquette, courseId)).id;
      state.dirtyIds = [...state.dirtyIds, id];
      return state;
    });
  }

  @Action(AddNewSemesterToYear)
  @ImmutableContext()
  public addSemesterToYEar(
    ctx: StateContext<MaquetteStateModel>,
    { yearId }: AddNewSemesterToYear,
  ) {
    ctx.setState((state: MaquetteStateModel) => {
      const year: Year = reduceChain(state.items, ['years']).find(ye => ye.id === yearId);
      const uid = uuid();
      const newSem: Semester = {
        modules: [],
        id: uid,
        _id: uid,
        number: year.semesters.length + 1,
      };
      year.semesters = [...year.semesters, newSem];

      return state;
    });
  }

  @Action(AddEmptyCourseToModule)
  @ImmutableContext()
  public addEmptyCourseToModule(
    ctx: StateContext<MaquetteStateModel>,
    { moduleId }: AddEmptyCourseToModule,
  ) {
    ctx.setState((state: MaquetteStateModel) => {
      const module: Module = reduceChain(state.items, ['years', 'semesters', 'modules']).find(
        val => val.id === moduleId,
      );
      const newID = uuid();
      const newCourse: Course = {
        lengthExam: 0,
        teacher: '',
        commun: '',
        name: '',
        nmbGroupTd: 1,
        nmbAmphiHour: 0,
        nmbTdHour: 0,
        nmbEcts: 0,
        coefCC: 0,
        coefExam: 0,
        examType: '',
        courseEnglish: false,
        englishTranslation: '',
        ratrappage: true,
        _id: newID,
        id: newID,
      };
      console.log(module.courses.length);
      module.courses = [...module.courses, newCourse];
      console.log(module.courses.length);
      return state;
    });
  }

  @Action(DeleteModule)
  @ImmutableContext()
  public deleteModule(ctx: StateContext<MaquetteStateModel>, { moduleId }: DeleteModule) {
    ctx.setState((state: MaquetteStateModel) => {
      const semester: Semester = reduceChain(state.items, ['years', 'semesters']).find(
        (sem: Semester) => !!sem.modules.find(module => module.id === moduleId),
      );
      const moduleIdx = semester.modules.findIndex(mod => mod.id === moduleId);
      semester.modules.splice(moduleIdx, 1);
      return state;
    });
  }

  @Action(DeleteCourse)
  @ImmutableContext()
  public deleteCourse(ctx: StateContext<MaquetteStateModel>, { courseId }: DeleteCourse) {
    ctx.setState((state: MaquetteStateModel) => {
      const module: Module = reduceChain(state.items, ['years', 'semesters', 'modules']).find(
        (mod: Module) => !!mod.courses.find(course => course.id === courseId),
      );
      const courseIdx = module.courses.findIndex(course => course.id === courseId);
      module.courses.splice(courseIdx, 1);

      const id = state.items.find(maquette => MaquetteHelpers.hasCourse(maquette, courseId)).id;
      state.dirtyIds = [...state.dirtyIds, id];
      return state;
    });
  }

  @Action(DeleteSemesterById)
  @ImmutableContext()
  public deleteSemesterById(
    ctx: StateContext<MaquetteStateModel>,
    { semesterId }: DeleteSemesterById,
  ) {
    ctx.setState((state: MaquetteStateModel) => {
      const year: Year = reduceChain(state.items, ['years']).find(
        (ye: Year) => !!ye.semesters.find(sem => sem.id === semesterId),
      );
      year.semesters = year.semesters.filter(sem => sem.id !== semesterId);
      return state;
    });
  }

  @Action(SaveMaquetteById)
  public save(ctx: StateContext<MaquetteStateModel>, { id }: SaveMaquetteById) {
    const maq = ctx.getState().items.find(obj => obj.id === id);
    return this.maquetteService.save(id, maq).pipe(
      tap(val => {
        ctx.setState(
          patch<MaquetteStateModel>({
            // @ts-ignore
            items: updateItem(ita => ita.id === id, val),
            dirtyIds: arr => arr.filter(fafa => fafa !== id),
          }),
        );
      }),
    );
  }

  @Action(SaveNewMaquette)
  public saveNew(ctx: StateContext<MaquetteStateModel>) {
    const maq = ctx.getState().items.find(obj => obj.id === 'new');

    return this.maquetteService.saveNew(maq).pipe(
      tap(val => {
        ctx.setState(
          patch<MaquetteStateModel>({
            // @ts-ignore
            items: insertItem(val),
            dirtyIds: arr => arr.filter(fafa => fafa !== 'new'),
          }),
        );
      }),
      switchMap(val => ctx.dispatch(new Navigate(['maquette', 'detail', val.id]))),
    );
  }

  @Action(NewMaquette)
  @ImmutableContext()
  public newMaquette(ctx: StateContext<MaquetteStateModel>, { master, schoolYear }: NewMaquette) {
    ctx.setState(state => {
      const maybeNew = state.items.findIndex(val => val.id === 'new');
      if (maybeNew) {
        state.items.splice(maybeNew, 1);
      }
      const newMaqu: Maquette = {
        id: 'new',
        _id: 'new',
        master,
        inProduction: false,
        years: [],
        schoolYear,
      };
      state.items.push(newMaqu);

      return state;
    });
    return ctx.dispatch(new Navigate(['maquette', 'detail', 'new']));
  }

  @Action(LockOrUnlock)
  public lockOrUnlock(ctx: StateContext<MaquetteStateModel>, { id }: LockOrUnlock) {
    const maq = ctx.getState().items.find(obj => obj.id === id);
    let obs;
    if (maq.inProduction) {
      obs = this.maquetteService.unlock(id);
    } else {
      obs = this.maquetteService.lock(id);
    }
    return obs.pipe(
      tap(val => {
        ctx.setState(
          patch<MaquetteStateModel>({
            // @ts-ignore
            items: updateItem(ita => ita.id === id, val),
            dirtyIds: arr => arr.filter(fafa => fafa !== id),
          }),
        );
      }),
    );
  }

  @Action(MarkAsDirty)
  @ImmutableContext()
  public markDirty(ctx: StateContext<MaquetteStateModel>, { id }: MarkAsDirty) {
    ctx.setState((state: MaquetteStateModel) => {
      if (state.dirtyIds.includes(id)) {
        return state;
      }
      state.dirtyIds = [...state.dirtyIds, id];

      return state;
    });
  }

  @Action(MaquetteNewYear)
  @ImmutableContext()
  public newYear(ctx: StateContext<MaquetteStateModel>, { name, maquetteId }: MaquetteNewYear) {
    ctx.setState((state: MaquetteStateModel) => {
      const maquette = state.items.find(maq => maq.id === maquetteId);
      const newID = uuid();
      const newYear: Year = {
        semesters: [],
        extras: [],
        level: name,
        id: newID,
        _id: newID,
      };
      maquette.years.push(newYear);
      return state;
    });
  }

  @Action(AddModuleToSemester)
  @ImmutableContext()
  public addModuleToSemester(
    ctx: StateContext<MaquetteStateModel>,
    { semesterId }: AddModuleToSemester,
  ) {
    ctx.setState((state: MaquetteStateModel) => {
      const semester: Semester = reduceChain(state.items, ['years', 'semesters']).find(
        (sem: Semester) => sem.id === semesterId,
      );
      const uid = uuid();
      const module: Module = {
        id: uid,
        _id: uid,
        name: '',
        courses: [],
      };
      semester.modules.push(module);
      return state;
    });
  }

  private findYearById(id: string, state: MaquetteStateModel): Year {
    return this.findDeep(id, ['years'], state);
  }

  private findSemesterById(id: string, state: MaquetteStateModel): Semester {
    return this.findDeep(id, ['years', 'semesters'], state);
  }

  private findModuleById(id: string, state: MaquetteStateModel): Module {
    return this.findDeep(id, ['years', 'semesters', 'modules'], state);
  }

  private findCourseById(id: string, state: MaquetteStateModel): Course {
    return this.findDeep(id, ['years', 'semesters', 'modules', 'courses'], state);
  }

  private findExtraModule(id: string, state: MaquetteStateModel): ExtraModules {
    return this.findDeep(id, ['years', 'extras'], state);
  }

  private findExtraModuleItem(id: string, state: MaquetteStateModel): ItemExtra {
    return this.findDeep(id, ['years', 'extras', 'items'], state);
  }

  private findDeep(id: string, keys: string[], state: MaquetteStateModel) {
    return reduceChain(state.items, keys).find(item => item._id === id);
  }
}
