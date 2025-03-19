"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Pencil, Trash } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from "next/link"

export type Course = {
  id: number
  title: string
  difficulty_level: string
  duration_minutes: number
  instructorName: string
  published: boolean
  tags: string
  created_at: string
}

export const columns: ColumnDef<Course>[] = [
  {
    accessorKey: "title",
    header: "Title",
    cell: ({ row }) => {
      return (
        <div className="font-medium">
          <Link href={`/admin/courses/${row.original.id}`} className="hover:underline">
            {row.getValue("title")}
          </Link>
        </div>
      )
    },
  },
  {
    accessorKey: "difficulty_level",
    header: "Level",
    cell: ({ row }) => {
      return <Badge variant="outline">{row.getValue("difficulty_level")}</Badge>
    },
  },
  {
    accessorKey: "duration_minutes",
    header: "Duration",
    cell: ({ row }) => {
      return <div>{row.getValue("duration_minutes")} min</div>
    },
  },
  {
    accessorKey: "instructorName",
    header: "Instructor",
  },
  {
    accessorKey: "tags",
    header: "Tags",
    cell: ({ row }) => {
      const tags = (row.getValue("tags") as string).split(", ")
      return (
        <div className="flex flex-wrap gap-1">
          {tags.slice(0, 2).map((tag, i) => (
            <Badge key={i} variant="secondary" className="whitespace-nowrap">
              {tag}
            </Badge>
          ))}
          {tags.length > 2 && <Badge variant="secondary">+{tags.length - 2}</Badge>}
        </div>
      )
    },
  },
  {
    accessorKey: "published",
    header: "Status",
    cell: ({ row }) => {
      return (
        <Badge variant={row.getValue("published") ? "default" : "secondary"}>
          {row.getValue("published") ? "Published" : "Draft"}
        </Badge>
      )
    },
  },
  {
    accessorKey: "created_at",
    header: "Created",
    cell: ({ row }) => {
      return <div>{new Date(row.getValue("created_at")).toLocaleDateString()}</div>
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const course = row.original

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <Link href={`/admin/courses/${course.id}`}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600">
              <Trash className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]

