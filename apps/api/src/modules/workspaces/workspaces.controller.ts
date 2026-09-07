import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { WorkspaceService } from './workspace.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  User,
  Workspace,
  WorkspaceMember,
  WorkspaceInvitation,
} from '@devflow/shared-types';

@Controller('workspaces')
@UseGuards(JwtAuthGuard)
export class WorkspacesController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createWorkspace(
    @CurrentUser() user: User,
    @Body() dto: CreateWorkspaceDto,
  ): Promise<Workspace> {
    return this.workspaceService.createWorkspace(user.id, dto, user);
  }

  @Get()
  async listWorkspaces(@CurrentUser() user: User): Promise<Workspace[]> {
    return this.workspaceService.listUserWorkspaces(user.id);
  }

  @Post('invitations/accept')
  @HttpCode(HttpStatus.OK)
  async acceptInvitation(
    @CurrentUser() user: User,
    @Body() dto: AcceptInvitationDto,
  ): Promise<WorkspaceMember> {
    return this.workspaceService.acceptInvitation(dto.token, user.id, user);
  }

  @Get(':id')
  async getWorkspace(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<Workspace> {
    return this.workspaceService.getWorkspaceById(id, user.id);
  }

  @Patch(':id')
  async updateWorkspace(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateWorkspaceDto,
  ): Promise<Workspace> {
    return this.workspaceService.updateWorkspace(id, user.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteWorkspace(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<{ message: string }> {
    return this.workspaceService.deleteWorkspace(id, user.id);
  }

  @Get(':id/members')
  async listMembers(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<WorkspaceMember[]> {
    return this.workspaceService.listMembers(id, user.id);
  }

  @Post(':id/members/invite')
  @HttpCode(HttpStatus.CREATED)
  async inviteMember(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: InviteMemberDto,
  ): Promise<WorkspaceInvitation> {
    return this.workspaceService.inviteMember(id, user.id, dto, user);
  }

  @Get(':id/members/invitations')
  async listPendingInvitations(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<WorkspaceInvitation[]> {
    return this.workspaceService.listPendingInvitations(id, user.id);
  }

  @Patch(':id/members/:userId/role')
  async updateMemberRole(
    @Param('id') id: string,
    @Param('userId') targetUserId: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateMemberRoleDto,
  ): Promise<WorkspaceMember> {
    return this.workspaceService.updateMemberRole(id, user.id, targetUserId, dto.role);
  }

  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.OK)
  async removeMember(
    @Param('id') id: string,
    @Param('userId') targetUserId: string,
    @CurrentUser() user: User,
  ): Promise<{ message: string }> {
    return this.workspaceService.removeMember(id, user.id, targetUserId);
  }
}
