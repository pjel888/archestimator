import type { Meta, StoryObj } from "@storybook/react";

import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { StoryPanel } from "../ui-library/story-canvas";
import { Badge } from "@/components/ui/badge";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "active" | "inactive";
};

const data: User[] = [
  { id: "1", name: "Alice Smith", email: "alice@example.com", role: "Admin", status: "active" },
  { id: "2", name: "Bob Jones", email: "bob@example.com", role: "User", status: "active" },
  { id: "3", name: "Charlie Brown", email: "charlie@example.com", role: "User", status: "inactive" },
  { id: "4", name: "Diana Prince", email: "diana@example.com", role: "Manager", status: "active" },
  { id: "5", name: "Evan Wright", email: "evan@example.com", role: "User", status: "inactive" },
];

const columns: ColumnDef<User>[] = [
  {
    id: "name",
    header: "Name",
    cell: (item) => <span className="font-medium">{item.name}</span>,
  },
  {
    id: "email",
    header: "Email",
    cell: (item) => <span className="text-tertiary">{item.email}</span>,
  },
  {
    id: "role",
    header: "Role",
    cell: (item) => item.role,
  },
  {
    id: "status",
    header: "Status",
    cell: (item) => (
      <Badge tone={item.status === "active" ? "success" : "neutral"}>
        {item.status}
      </Badge>
    ),
  },
];

const sortableColumns: ColumnDef<User>[] = columns.map(col => ({
  ...col,
  sortable: true,
}));

const meta = {
  title: "Data Display/DataTable",
  component: DataTable,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "DataTable component for displaying tabular data with sorting, selection, and pagination.",
      },
    },
  },
  args: {
    data: data.slice(0, 3),
    columns,
    keyExtractor: (item: User) => item.id,
  },
} satisfies Meta<typeof DataTable<User>>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <StoryPanel>
      <DataTable
        data={data.slice(0, 3)}
        columns={columns}
        keyExtractor={(item) => item.id}
      />
    </StoryPanel>
  ),
};

export const Loading: Story = {
  render: () => (
    <StoryPanel>
      <DataTable
        data={[]}
        columns={columns}
        keyExtractor={(item) => item.id}
        isLoading
      />
    </StoryPanel>
  ),
};

export const Empty: Story = {
  render: () => (
    <StoryPanel>
      <DataTable
        data={[]}
        columns={columns}
        keyExtractor={(item) => item.id}
        emptyState={{
          title: "No users found",
          description: "There are no users matching your criteria.",
        }}
      />
    </StoryPanel>
  ),
};

export const Error: Story = {
  render: () => (
    <StoryPanel>
      <DataTable
        data={[]}
        columns={columns}
        keyExtractor={(item) => item.id}
        isError
        error="Failed to load users. Please try again later."
      />
    </StoryPanel>
  ),
};

export const ClickableRows: Story = {
  render: () => (
    <StoryPanel>
      <DataTable
        data={data.slice(0, 3)}
        columns={columns}
        keyExtractor={(item) => item.id}
        onRowClick={(item) => console.log("Clicked row:", item)}
      />
    </StoryPanel>
  ),
};

export const SortableColumns: Story = {
  render: () => (
    <StoryPanel>
      <DataTable
        data={data}
        columns={sortableColumns}
        keyExtractor={(item) => item.id}
        onSort={(key, direction) => console.log("Sort:", key, direction)}
      />
    </StoryPanel>
  ),
};

export const SortedWithIndicator: Story = {
  render: () => (
    <StoryPanel>
      <DataTable
        data={data}
        columns={sortableColumns}
        keyExtractor={(item) => item.id}
        sortedKey="name"
        sortDirection="asc"
        onSort={(key, direction) => console.log("Sort:", key, direction)}
      />
    </StoryPanel>
  ),
};

export const WithRowSelection: Story = {
  render: () => (
    <StoryPanel>
      <DataTable
        data={data}
        columns={columns}
        keyExtractor={(item) => item.id}
        selectable
        selectedRows={new Set(["1", "3"])}
        onSelectionChange={(selected) => console.log("Selected:", selected)}
      />
    </StoryPanel>
  ),
};

export const WithPagination: Story = {
  render: () => (
    <StoryPanel>
      <DataTable
        data={data.slice(0, 3)}
        columns={columns}
        keyExtractor={(item) => item.id}
        pagination={{
          page: 1,
          totalPages: 5,
          onPageChange: (page) => console.log("Page changed to:", page),
        }}
      />
    </StoryPanel>
  ),
};

export const WithToolbar: StoryObj<typeof DataTable<User>> = {
  render: () => (
    <StoryPanel>
      <DataTable
        columns={columns}
        data={data}
        keyExtractor={(user) => user.id}
      />
    </StoryPanel>
  ),
};

export const ErrorState: StoryObj<typeof DataTable<User>> = {
  render: () => (
    <StoryPanel>
      <DataTable
        columns={columns}
        data={[]}
        keyExtractor={(user) => user.id}
        isError
        error="Failed to load data from server"
      />
    </StoryPanel>
  ),
};
