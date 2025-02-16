import { Component, OnDestroy, OnInit } from '@angular/core'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { Subject, first, takeUntil } from 'rxjs'
import { PaperlessGroup } from 'src/app/data/paperless-group'
import { PaperlessUser } from 'src/app/data/paperless-user'
import { PaperlessSSOGroup } from 'src/app/data/paperless-sso-group'
import { PermissionsService } from 'src/app/services/permissions.service'
import { GroupService } from 'src/app/services/rest/group.service'
import { UserService } from 'src/app/services/rest/user.service'
import { SsoGroupService } from 'src/app/services/rest/sso-group.service'
import { ToastService } from 'src/app/services/toast.service'
import { ConfirmDialogComponent } from '../../common/confirm-dialog/confirm-dialog.component'
import { EditDialogMode } from '../../common/edit-dialog/edit-dialog.component'
import { GroupEditDialogComponent } from '../../common/edit-dialog/group-edit-dialog/group-edit-dialog.component'
import { UserEditDialogComponent } from '../../common/edit-dialog/user-edit-dialog/user-edit-dialog.component'
import { SsoGroupEditDialogComponent } from '../../common/edit-dialog/sso-group-edit-dialog/sso-group-edit-dialog.component'
import { ComponentWithPermissions } from '../../with-permissions/with-permissions.component'
import { SettingsService } from 'src/app/services/settings.service'
import { SETTINGS_KEYS } from 'src/app/data/paperless-uisettings'

@Component({
  selector: 'pngx-users-groups',
  templateUrl: './users-groups.component.html',
  styleUrls: ['./users-groups.component.scss'],
})
export class UsersAndGroupsComponent
  extends ComponentWithPermissions
  implements OnInit, OnDestroy
{
  users: PaperlessUser[]
  groups: PaperlessGroup[]
  ssoGroups: PaperlessSSOGroup[]

  unsubscribeNotifier: Subject<any> = new Subject()

  constructor(
    private usersService: UserService,
    private groupsService: GroupService,
    private ssoGroupService: SsoGroupService,
    private toastService: ToastService,
    private modalService: NgbModal,
    public permissionsService: PermissionsService,
    private settings: SettingsService
  ) {
    super()
  }

  ngOnInit(): void {
    this.usersService
      .listAll(null, null, { full_perms: true })
      .pipe(first(), takeUntil(this.unsubscribeNotifier))
      .subscribe({
        next: (r) => {
          this.users = r.results
        },
        error: (e) => {
          this.users = []
          this.toastService.showError($localize`Error retrieving users`, e)
        },
      })

    this.groupsService
      .listAll(null, null, { full_perms: true })
      .pipe(first(), takeUntil(this.unsubscribeNotifier))
      .subscribe({
        next: (r) => {
          this.groups = r.results
        },
        error: (e) => {
          this.groups = []
          this.toastService.showError($localize`Error retrieving groups`, e)
        },
      })

    if (this.ssoEnabled) {
      this.ssoGroupService
        .listAll(null, null, { full_perms: true })
        .pipe(first(), takeUntil(this.unsubscribeNotifier))
        .subscribe({
          next: (r) => {
            this.ssoGroups = r.results
          },
          error: (e) => {
            this.ssoGroups = []
            this.toastService.showError(
              $localize`Error retrieving SSO groups`,
              e
            )
          },
        })
    } else {
      this.ssoGroups = []
    }
  }

  ngOnDestroy() {
    this.unsubscribeNotifier.next(true)
  }

  editUser(user: PaperlessUser = null) {
    var modal = this.modalService.open(UserEditDialogComponent, {
      backdrop: 'static',
      size: 'xl',
    })
    modal.componentInstance.dialogMode = user
      ? EditDialogMode.EDIT
      : EditDialogMode.CREATE
    modal.componentInstance.object = user
    modal.componentInstance.succeeded
      .pipe(takeUntil(this.unsubscribeNotifier))
      .subscribe((newUser: PaperlessUser) => {
        if (
          newUser.id === this.settings.currentUser.id &&
          (modal.componentInstance as UserEditDialogComponent).passwordIsSet
        ) {
          this.toastService.showInfo(
            $localize`Password has been changed, you will be logged out momentarily.`
          )
          setTimeout(() => {
            window.location.href = `${window.location.origin}/accounts/logout/?next=/accounts/login/`
          }, 2500)
        } else {
          this.toastService.showInfo(
            $localize`Saved user "${newUser.username}".`
          )
          this.usersService.listAll().subscribe((r) => {
            this.users = r.results
          })
        }
      })
    modal.componentInstance.failed
      .pipe(takeUntil(this.unsubscribeNotifier))
      .subscribe((e) => {
        this.toastService.showError($localize`Error saving user.`, e)
      })
  }

  deleteUser(user: PaperlessUser) {
    let modal = this.modalService.open(ConfirmDialogComponent, {
      backdrop: 'static',
    })
    modal.componentInstance.title = $localize`Confirm delete user account`
    modal.componentInstance.messageBold = $localize`This operation will permanently delete this user account.`
    modal.componentInstance.message = $localize`This operation cannot be undone.`
    modal.componentInstance.btnClass = 'btn-danger'
    modal.componentInstance.btnCaption = $localize`Proceed`
    modal.componentInstance.confirmClicked.subscribe(() => {
      modal.componentInstance.buttonsEnabled = false
      this.usersService.delete(user).subscribe({
        next: () => {
          modal.close()
          this.toastService.showInfo($localize`Deleted user`)
          this.usersService.listAll().subscribe((r) => {
            this.users = r.results
          })
        },
        error: (e) => {
          this.toastService.showError($localize`Error deleting user.`, e)
        },
      })
    })
  }

  editGroup(group: PaperlessGroup = null) {
    var modal = this.modalService.open(GroupEditDialogComponent, {
      backdrop: 'static',
      size: 'lg',
    })
    modal.componentInstance.dialogMode = group
      ? EditDialogMode.EDIT
      : EditDialogMode.CREATE
    modal.componentInstance.object = group
    modal.componentInstance.succeeded
      .pipe(takeUntil(this.unsubscribeNotifier))
      .subscribe((newGroup) => {
        this.toastService.showInfo($localize`Saved group "${newGroup.name}".`)
        this.groupsService.listAll().subscribe((r) => {
          this.groups = r.results
        })
      })
    modal.componentInstance.failed
      .pipe(takeUntil(this.unsubscribeNotifier))
      .subscribe((e) => {
        this.toastService.showError($localize`Error saving group.`, e)
      })
  }

  deleteGroup(group: PaperlessGroup) {
    let modal = this.modalService.open(ConfirmDialogComponent, {
      backdrop: 'static',
    })
    modal.componentInstance.title = $localize`Confirm delete user group`
    modal.componentInstance.messageBold = $localize`This operation will permanently delete this user group.`
    modal.componentInstance.message = $localize`This operation cannot be undone.`
    modal.componentInstance.btnClass = 'btn-danger'
    modal.componentInstance.btnCaption = $localize`Proceed`
    modal.componentInstance.confirmClicked.subscribe(() => {
      modal.componentInstance.buttonsEnabled = false
      this.groupsService.delete(group).subscribe({
        next: () => {
          modal.close()
          this.toastService.showInfo($localize`Deleted group`)
          this.groupsService.listAll().subscribe((r) => {
            this.groups = r.results
          })
        },
        error: (e) => {
          this.toastService.showError($localize`Error deleting group.`, e)
        },
      })
    })
  }

  public get ssoEnabled(): boolean {
    return this.settings.get(SETTINGS_KEYS.SSO_ENABLED)
  }

  editSsoGroup(ssoGroup: PaperlessSSOGroup = null) {
    var modal = this.modalService.open(SsoGroupEditDialogComponent, {
      backdrop: 'static',
    })
    modal.componentInstance.dialogMode = ssoGroup
      ? EditDialogMode.EDIT
      : EditDialogMode.CREATE
    modal.componentInstance.object = ssoGroup
    modal.componentInstance.succeeded
      .pipe(takeUntil(this.unsubscribeNotifier))
      .subscribe((newGroup) => {
        this.toastService.showInfo(
          $localize`Saved SSO group "${newGroup.name}".`
        )
        this.ssoGroupService.listAll().subscribe((r) => {
          this.ssoGroups = r.results
        })
      })
    modal.componentInstance.failed
      .pipe(takeUntil(this.unsubscribeNotifier))
      .subscribe((e) => {
        this.toastService.showError($localize`Error saving SSO group.`, e)
      })
  }

  deleteSsoGroup(ssoGroup: PaperlessSSOGroup) {
    let modal = this.modalService.open(ConfirmDialogComponent, {
      backdrop: 'static',
    })
    modal.componentInstance.title = $localize`Confirm delete SSO group`
    modal.componentInstance.messageBold = $localize`This operation will permanently delete this SSO group.`
    modal.componentInstance.message = $localize`This operation cannot be undone.`
    modal.componentInstance.btnClass = 'btn-danger'
    modal.componentInstance.btnCaption = $localize`Proceed`
    modal.componentInstance.confirmClicked.subscribe(() => {
      modal.componentInstance.buttonsEnabled = false
      this.ssoGroupService.delete(ssoGroup).subscribe({
        next: () => {
          modal.close()
          this.toastService.showInfo($localize`Deleted SSO group`)
          this.ssoGroupService.listAll().subscribe((r) => {
            this.ssoGroups = r.results
          })
        },
        error: (e) => {
          this.toastService.showError($localize`Error deleting SSO group.`, e)
        },
      })
    })
  }

  getGroupName(id: number): string {
    return this.groups?.find((g) => g.id === id)?.name ?? ''
  }
}
