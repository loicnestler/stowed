import { mkdir, stat, symlink, unlink } from 'node:fs/promises'
import { dirname } from 'node:path'
import { AutoLinkMode, AutoLinkResult } from './enums'
import type { StowedOptions } from './main'
import { COLORS } from './utils'

export class AutoLink {
  public result?: AutoLinkResult
  private mode: AutoLinkMode = AutoLinkMode.Link

  constructor(
    public readonly realPath: string,
    public readonly linkPath: string,
    private readonly options?: StowedOptions
  ) {
    this.mode = options?.unlink ? AutoLinkMode.Unlink : AutoLinkMode.Link
  }

  get pretty() {
    return `${COLORS.Orange}${this.realPath}${COLORS.Gray}  ${COLORS.Orange}${this.linkPath}${COLORS.Reset}`
  }

  private async exists(): Promise<boolean> {
    try {
      await stat(this.linkPath)
      return true
    } catch {
      return false
    }
  }

  private logStatus() {
    if (
      this.result === AutoLinkResult.Nothing &&
      this.options?.silent === true
    ) {
      return
    }

    const dryRun = this.options?.dryRun ?? false
    const dryRunPrefix = dryRun
      ? `${COLORS.Gray}[${COLORS.Italic}Dry run${COLORS.Reset}${COLORS.Gray}]${COLORS.Reset}`
      : ''

    switch (this.result) {
      case AutoLinkResult.Linked:
        console.log(
          `${dryRun ? dryRunPrefix : `${COLORS.Green}✔`} ${COLORS.Gray}Linked ${this.pretty}`
        )
        break
      case AutoLinkResult.Unlinked:
        console.log(
          `${dryRun ? dryRunPrefix : `${COLORS.Red}✘`} ${COLORS.Gray}Unlinked ${this.pretty}`
        )
        break
      case AutoLinkResult.Nothing:
        console.log(
          `  ${dryRun ? `${dryRunPrefix} ` : ''}${COLORS.Gray}Nothing to do for ${this.pretty}`
        )
        break
    }
  }

  async apply() {
    switch (this.mode) {
      case AutoLinkMode.Link:
        return this.link()
      case AutoLinkMode.Unlink:
        return this.unlink()
    }
  }

  private async link() {
    const fileExists = await this.exists()
    if (fileExists) {
      this.result = AutoLinkResult.Nothing
      this.logStatus()
      return
    }

    if (!this.options?.dryRun) {
      try {
        await mkdir(dirname(this.linkPath), { recursive: true })
      } catch (error) {
        this.result = AutoLinkResult.Failed
        console.log(
          `${COLORS.Red}Failed to create directory for ${this.linkPath}: ${(error as Error).message}`
        )
        return
      }

      try {
        await symlink(this.realPath, this.linkPath)
      } catch (error) {
        this.result = AutoLinkResult.Failed
        console.error(
          `${COLORS.Red}Failed to create symlink from ${this.realPath} to ${this.linkPath}: ${(error as Error).message}`
        )
        return
      }
    }

    this.result = AutoLinkResult.Linked
    this.logStatus()
  }

  private async unlink() {
    const fileExists = await this.exists()
    if (!fileExists) {
      this.result = AutoLinkResult.Nothing
      this.logStatus()
      return
    }

    if (!this.options?.dryRun) {
      try {
        await unlink(this.linkPath)
      } catch (error) {
        this.result = AutoLinkResult.Failed
        console.error(
          `${COLORS.Red}Failed to unlink ${this.linkPath}: ${(error as Error).message}`
        )
        return
      }
    }

    this.result = AutoLinkResult.Unlinked
    this.logStatus()
  }
}
