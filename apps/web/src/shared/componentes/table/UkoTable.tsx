import { useMemo, useState, type ReactNode } from "react";
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Typography,
  type TableCellProps,
} from "@mui/material";
import { styled, type SxProps, type Theme } from "@mui/material/styles";

type SortValue = string | number | null | undefined;
type SortDirection = "asc" | "desc";

export interface UkoTableColumn<T> {
  id: string;
  label: string;
  align?: TableCellProps["align"];
  width?: number | string;
  minWidth?: number;
  nowrap?: boolean;
  render: (row: T) => ReactNode;
  sortValue?: (row: T) => SortValue;
}

interface UkoTableProps<T> {
  ariaLabel: string;
  columns: UkoTableColumn<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  selectedRowId?: string | null;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  stickyHeader?: boolean;
  maxHeight?: number | string;
  sx?: SxProps<Theme>;
}

const HeaderCell = styled(TableCell)(({ theme }) => ({
  padding: "0.9rem 1rem",
  fontSize: 14,
  fontWeight: 500,
  lineHeight: 1.35,
  whiteSpace: "nowrap",
  color: theme.palette.text.secondary,
  backgroundColor: theme.palette.mode === "dark"
    ? theme.palette.action.hover
    : theme.palette.grey[100],
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

const BodyCell = styled(TableCell)(({ theme }) => ({
  padding: "0.85rem 1rem",
  fontSize: 13,
  fontWeight: 400,
  lineHeight: 1.45,
  color: theme.palette.text.primary,
  borderBottom: `1px dashed ${theme.palette.divider}`,
}));

const BodyRow = styled(TableRow, {
  shouldForwardProp: (prop) => prop !== "clickable",
})<{ clickable: boolean }>(({ theme, clickable }) => ({
  cursor: clickable ? "pointer" : "default",
  transition: "background-color 120ms ease",
  "&:last-of-type td": { borderBottom: 0 },
  "&:hover": clickable ? { backgroundColor: theme.palette.action.hover } : undefined,
  "&.Mui-selected, &.Mui-selected:hover": {
    backgroundColor: theme.palette.action.selected,
  },
}));

function compareValues(a: SortValue, b: SortValue): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "es", { numeric: true, sensitivity: "base" });
}

export function UkoTable<T>({
  ariaLabel,
  columns,
  rows,
  getRowId,
  selectedRowId = null,
  onRowClick,
  emptyMessage = "No hay datos disponibles.",
  stickyHeader = true,
  maxHeight,
  sx,
}: UkoTableProps<T>) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const sortedRows = useMemo(() => {
    const column = columns.find((item) => item.id === sortColumn);
    if (!column?.sortValue) return rows;
    return [...rows].sort((a, b) => {
      const result = compareValues(column.sortValue?.(a), column.sortValue?.(b));
      return sortDirection === "asc" ? result : -result;
    });
  }, [columns, rows, sortColumn, sortDirection]);

  const handleSort = (column: UkoTableColumn<T>) => {
    if (!column.sortValue) return;
    if (sortColumn === column.id) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column.id);
      setSortDirection("asc");
    }
  };

  return (
    <TableContainer
      component={Paper}
      variant="outlined"
      sx={{ maxHeight, borderRadius: 2, backgroundImage: "none", ...sx }}
    >
      <Table stickyHeader={stickyHeader} aria-label={ariaLabel} sx={{ minWidth: 760 }}>
        <TableHead>
          <TableRow>
            {columns.map((column) => (
              <HeaderCell
                key={column.id}
                align={column.align}
                sortDirection={sortColumn === column.id ? sortDirection : false}
                sx={{ width: column.width, minWidth: column.minWidth }}
              >
                {column.sortValue ? (
                  <TableSortLabel
                    active={sortColumn === column.id}
                    direction={sortColumn === column.id ? sortDirection : "asc"}
                    onClick={() => handleSort(column)}
                  >
                    {column.label}
                  </TableSortLabel>
                ) : column.label}
              </HeaderCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedRows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} sx={{ p: 2, border: 0 }}>
                <Box sx={{ minHeight: 220, display: "grid", placeItems: "center", borderRadius: 2, bgcolor: "action.selected" }}>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: "text.secondary" }}>
                    {emptyMessage}
                  </Typography>
                </Box>
              </TableCell>
            </TableRow>
          ) : sortedRows.map((row) => {
            const rowId = getRowId(row);
            return (
              <BodyRow
                key={rowId}
                hover={Boolean(onRowClick)}
                clickable={Boolean(onRowClick)}
                selected={rowId === selectedRowId}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((column) => (
                  <BodyCell
                    key={column.id}
                    align={column.align}
                    sx={{
                      width: column.width,
                      minWidth: column.minWidth,
                      whiteSpace: column.nowrap ? "nowrap" : "normal",
                    }}
                  >
                    {column.render(row)}
                  </BodyCell>
                ))}
              </BodyRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
