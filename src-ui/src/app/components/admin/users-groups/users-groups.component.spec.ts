import { DatePipe } from '@angular/common'
import { HttpClientTestingModule } from '@angular/common/http/testing'
import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing'
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { RouterTestingModule } from '@angular/router/testing'
import {
  NgbModule,
  NgbAlertModule,
  NgbModal,
  NgbModalRef,
} from '@ng-bootstrap/ng-bootstrap'
import { NgSelectModule } from '@ng-select/ng-select'
import { throwError, of } from 'rxjs'
import { routes } from 'src/app/app-routing.module'
import { IfOwnerDirective } from 'src/app/directives/if-owner.directive'
import { IfPermissionsDirective } from 'src/app/directives/if-permissions.directive'
import { PermissionsGuard } from 'src/app/guards/permissions.guard'
import { CustomDatePipe } from 'src/app/pipes/custom-date.pipe'
import { SafeHtmlPipe } from 'src/app/pipes/safehtml.pipe'
import { PermissionsService } from 'src/app/services/permissions.service'
import { GroupService } from 'src/app/services/rest/group.service'
import { UserService } from 'src/app/services/rest/user.service'
import { SsoGroupService } from 'src/app/services/rest/sso-group.service'
import { SettingsService } from 'src/app/services/settings.service'
import { ToastService } from 'src/app/services/toast.service'
import { ConfirmDialogComponent } from '../../common/confirm-dialog/confirm-dialog.component'
import { GroupEditDialogComponent } from '../../common/edit-dialog/group-edit-dialog/group-edit-dialog.component'
import { UserEditDialogComponent } from '../../common/edit-dialog/user-edit-dialog/user-edit-dialog.component'
import { SsoGroupEditDialogComponent } from '../../common/edit-dialog/sso-group-edit-dialog/sso-group-edit-dialog.component'
import { CheckComponent } from '../../common/input/check/check.component'
import { NumberComponent } from '../../common/input/number/number.component'
import { PasswordComponent } from '../../common/input/password/password.component'
import { PermissionsGroupComponent } from '../../common/input/permissions/permissions-group/permissions-group.component'
import { PermissionsUserComponent } from '../../common/input/permissions/permissions-user/permissions-user.component'
import { SelectComponent } from '../../common/input/select/select.component'
import { TagsComponent } from '../../common/input/tags/tags.component'
import { TextComponent } from '../../common/input/text/text.component'
import { PageHeaderComponent } from '../../common/page-header/page-header.component'
import { SettingsComponent } from '../settings/settings.component'
import { UsersAndGroupsComponent } from './users-groups.component'
import { PaperlessUser } from 'src/app/data/paperless-user'
import { PaperlessGroup } from 'src/app/data/paperless-group'
import { PaperlessSSOGroup } from 'src/app/data/paperless-sso-group'
import { SETTINGS_KEYS } from 'src/app/data/paperless-uisettings'

const users = [
  { id: 1, username: 'user1', is_superuser: false },
  { id: 2, username: 'user2', is_superuser: false },
]
const groups = [
  { id: 1, name: 'group1' },
  { id: 2, name: 'group2' },
]
const ssoGroups = [
  { id: 1, name: 'sso group1', group: 1 },
  { id: 2, name: 'sso group2', group: 2 },
]

describe('UsersAndGroupsComponent', () => {
  let component: UsersAndGroupsComponent
  let fixture: ComponentFixture<UsersAndGroupsComponent>
  let settingsService: SettingsService
  let modalService: NgbModal
  let toastService: ToastService
  let userService: UserService
  let permissionsService: PermissionsService
  let groupService: GroupService
  let ssoGroupService: SsoGroupService

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [
        UsersAndGroupsComponent,
        SettingsComponent,
        PageHeaderComponent,
        IfPermissionsDirective,
        CustomDatePipe,
        ConfirmDialogComponent,
        CheckComponent,
        SafeHtmlPipe,
        SelectComponent,
        TextComponent,
        PasswordComponent,
        NumberComponent,
        TagsComponent,
        PermissionsUserComponent,
        PermissionsGroupComponent,
        IfOwnerDirective,
      ],
      providers: [CustomDatePipe, DatePipe, PermissionsGuard],
      imports: [
        NgbModule,
        HttpClientTestingModule,
        RouterTestingModule.withRoutes(routes),
        FormsModule,
        ReactiveFormsModule,
        NgbAlertModule,
        NgSelectModule,
      ],
    }).compileComponents()
    fixture = TestBed.createComponent(UsersAndGroupsComponent)
    settingsService = TestBed.inject(SettingsService)
    settingsService.currentUser = users[0]
    userService = TestBed.inject(UserService)
    modalService = TestBed.inject(NgbModal)
    toastService = TestBed.inject(ToastService)
    permissionsService = TestBed.inject(PermissionsService)
    jest.spyOn(permissionsService, 'currentUserCan').mockReturnValue(true)
    jest
      .spyOn(permissionsService, 'currentUserHasObjectPermissions')
      .mockReturnValue(true)
    jest
      .spyOn(permissionsService, 'currentUserOwnsObject')
      .mockReturnValue(true)
    groupService = TestBed.inject(GroupService)
    ssoGroupService = TestBed.inject(SsoGroupService)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  function completeSetup(excludeService = null) {
    if (excludeService !== userService) {
      jest.spyOn(userService, 'listAll').mockReturnValue(
        of({
          all: users.map((a) => a.id),
          count: users.length,
          results: (users as PaperlessUser[]).concat([]),
        })
      )
    }
    if (excludeService !== groupService) {
      jest.spyOn(groupService, 'listAll').mockReturnValue(
        of({
          all: groups.map((r) => r.id),
          count: groups.length,
          results: (groups as PaperlessGroup[]).concat([]),
        })
      )
    }
    if (excludeService !== ssoGroupService) {
      jest.spyOn(ssoGroupService, 'listAll').mockReturnValue(
        of({
          all: ssoGroups.map((r) => r.id),
          count: ssoGroups.length,
          results: (ssoGroups as PaperlessSSOGroup[]).concat([]),
        })
      )
    }

    fixture = TestBed.createComponent(UsersAndGroupsComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  }

  it('should support edit / create user, show error if needed', () => {
    completeSetup()
    let modal: NgbModalRef
    modalService.activeInstances.subscribe((refs) => (modal = refs[0]))
    component.editUser(users[0])
    const editDialog = modal.componentInstance as UserEditDialogComponent
    const toastErrorSpy = jest.spyOn(toastService, 'showError')
    const toastInfoSpy = jest.spyOn(toastService, 'showInfo')
    editDialog.failed.emit()
    expect(toastErrorSpy).toBeCalled()
    settingsService.currentUser = users[1] // simulate logged in as different user
    editDialog.succeeded.emit(users[0])
    expect(toastInfoSpy).toHaveBeenCalledWith(
      `Saved user "${users[0].username}".`
    )
    component.editUser()
  })

  it('should support delete user, show error if needed', () => {
    completeSetup()
    let modal: NgbModalRef
    modalService.activeInstances.subscribe((refs) => (modal = refs[0]))
    component.deleteUser(users[0])
    const deleteDialog = modal.componentInstance as ConfirmDialogComponent
    const deleteSpy = jest.spyOn(userService, 'delete')
    const toastErrorSpy = jest.spyOn(toastService, 'showError')
    const toastInfoSpy = jest.spyOn(toastService, 'showInfo')
    const listAllSpy = jest.spyOn(userService, 'listAll')
    deleteSpy.mockReturnValueOnce(
      throwError(() => new Error('error deleting user'))
    )
    deleteDialog.confirm()
    expect(toastErrorSpy).toBeCalled()
    deleteSpy.mockReturnValueOnce(of(true))
    deleteDialog.confirm()
    expect(listAllSpy).toHaveBeenCalled()
    expect(toastInfoSpy).toHaveBeenCalledWith('Deleted user')
  })

  it('should logout current user if password changed, after delay', fakeAsync(() => {
    completeSetup()
    let modal: NgbModalRef
    modalService.activeInstances.subscribe((refs) => (modal = refs[0]))
    component.editUser(users[0])
    const editDialog = modal.componentInstance as UserEditDialogComponent
    editDialog.passwordIsSet = true
    settingsService.currentUser = users[0] // simulate logged in as same user
    editDialog.succeeded.emit(users[0])
    fixture.detectChanges()
    Object.defineProperty(window, 'location', {
      value: {
        href: 'http://localhost/',
      },
      writable: true, // possibility to override
    })
    tick(2600)
    expect(window.location.href).toContain('logout')
  }))

  it('should support edit / create group, show error if needed', () => {
    completeSetup()
    let modal: NgbModalRef
    modalService.activeInstances.subscribe((refs) => (modal = refs[0]))
    component.editGroup(groups[0])
    const editDialog = modal.componentInstance as GroupEditDialogComponent
    const toastErrorSpy = jest.spyOn(toastService, 'showError')
    const toastInfoSpy = jest.spyOn(toastService, 'showInfo')
    editDialog.failed.emit()
    expect(toastErrorSpy).toBeCalled()
    editDialog.succeeded.emit(groups[0])
    expect(toastInfoSpy).toHaveBeenCalledWith(
      `Saved group "${groups[0].name}".`
    )
    component.editGroup()
  })

  it('should support delete group, show error if needed', () => {
    completeSetup()
    let modal: NgbModalRef
    modalService.activeInstances.subscribe((refs) => (modal = refs[0]))
    component.deleteGroup(users[0])
    const deleteDialog = modal.componentInstance as ConfirmDialogComponent
    const deleteSpy = jest.spyOn(groupService, 'delete')
    const toastErrorSpy = jest.spyOn(toastService, 'showError')
    const toastInfoSpy = jest.spyOn(toastService, 'showInfo')
    const listAllSpy = jest.spyOn(groupService, 'listAll')
    deleteSpy.mockReturnValueOnce(
      throwError(() => new Error('error deleting group'))
    )
    deleteDialog.confirm()
    expect(toastErrorSpy).toBeCalled()
    deleteSpy.mockReturnValueOnce(of(true))
    deleteDialog.confirm()
    expect(listAllSpy).toHaveBeenCalled()
    expect(toastInfoSpy).toHaveBeenCalledWith('Deleted group')
  })

  it('should get group name', () => {
    completeSetup()
    expect(component.getGroupName(1)).toEqual(groups[0].name)
    expect(component.getGroupName(11)).toEqual('')
  })

  it('should show errors on load if load users failure', () => {
    const toastErrorSpy = jest.spyOn(toastService, 'showError')
    jest
      .spyOn(userService, 'listAll')
      .mockImplementation(() =>
        throwError(() => new Error('failed to load users'))
      )
    completeSetup(userService)
    fixture.detectChanges()
    expect(toastErrorSpy).toBeCalled()
  })

  it('should show errors on load if load groups failure', () => {
    const toastErrorSpy = jest.spyOn(toastService, 'showError')
    jest
      .spyOn(groupService, 'listAll')
      .mockImplementation(() =>
        throwError(() => new Error('failed to load groups'))
      )
    completeSetup(groupService)
    fixture.detectChanges()
    expect(toastErrorSpy).toBeCalled()
  })

  it('should hide sso groups if not enabled', () => {
    settingsService.set(SETTINGS_KEYS.SSO_ENABLED, false)
    const listSpy = jest.spyOn(ssoGroupService, 'listAll')
    completeSetup()
    fixture.detectChanges()
    expect(listSpy).not.toHaveBeenCalled()
    expect(fixture.debugElement.nativeElement.textContent).not.toContain('sso')
  })

  it('should show errors on load if load sso groups failure', () => {
    settingsService.set(SETTINGS_KEYS.SSO_ENABLED, true)
    const toastErrorSpy = jest.spyOn(toastService, 'showError')
    jest
      .spyOn(ssoGroupService, 'listAll')
      .mockImplementation(() =>
        throwError(() => new Error('failed to load SSO groups'))
      )
    completeSetup(ssoGroupService)
    fixture.detectChanges()
    expect(toastErrorSpy).toBeCalled()
  })

  it('should support edit / create sso group, show error if needed', () => {
    settingsService.set(SETTINGS_KEYS.SSO_ENABLED, true)
    completeSetup()
    let modal: NgbModalRef
    modalService.activeInstances.subscribe((refs) => (modal = refs[0]))
    component.editSsoGroup(ssoGroups[0])
    const editDialog = modal.componentInstance as SsoGroupEditDialogComponent
    const toastErrorSpy = jest.spyOn(toastService, 'showError')
    const toastInfoSpy = jest.spyOn(toastService, 'showInfo')
    editDialog.failed.emit()
    expect(toastErrorSpy).toBeCalled()
    editDialog.succeeded.emit(ssoGroups[0])
    expect(toastInfoSpy).toHaveBeenCalledWith(
      `Saved SSO group "${ssoGroups[0].name}".`
    )
    component.editSsoGroup()
  })

  it('should support delete sso group, show error if needed', () => {
    settingsService.set(SETTINGS_KEYS.SSO_ENABLED, true)
    completeSetup()
    let modal: NgbModalRef
    modalService.activeInstances.subscribe((refs) => (modal = refs[0]))
    component.deleteSsoGroup(ssoGroups[0])
    const deleteDialog = modal.componentInstance as ConfirmDialogComponent
    const deleteSpy = jest.spyOn(ssoGroupService, 'delete')
    const toastErrorSpy = jest.spyOn(toastService, 'showError')
    const toastInfoSpy = jest.spyOn(toastService, 'showInfo')
    const listAllSpy = jest.spyOn(ssoGroupService, 'listAll')
    deleteSpy.mockReturnValueOnce(
      throwError(() => new Error('error deleting SSO group'))
    )
    deleteDialog.confirm()
    expect(toastErrorSpy).toBeCalled()
    deleteSpy.mockReturnValueOnce(of(true))
    deleteDialog.confirm()
    expect(listAllSpy).toHaveBeenCalled()
    expect(toastInfoSpy).toHaveBeenCalledWith('Deleted SSO group')
  })
})
