import { ChevronLeft, ChevronRight, Search } from "lucide-react";

function SortMark({ sort, columnKey }) {
  if (!sort || sort.key !== columnKey) return null;
  return <span className="sort-mark">{sort.dir === "asc" ? "\u2191" : "\u2193"}</span>;
}

export function TableToolbar({
  search,
  onSearch,
  placeholder = "Search",
  value,
  onValueChange,
  options = [],
  label = "Rows",
  extra,
}) {
  return (
    <div className="table-toolbar">
      {onSearch && (
        <label className="search-field">
          <Search size={13} />
          <input
            className="table-search"
            type="search"
            value={search}
            placeholder={placeholder}
            onChange={(event) => onSearch(event.target.value)}
            aria-label={placeholder}
          />
        </label>
      )}
      {onValueChange && (
        <select
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          aria-label={label}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
      {extra}
    </div>
  );
}

export function SortHeader({ column, sort, onSort }) {
  if (!column.sortable) {
    return (
      <th className={column.className || ""} scope="col">
        {column.label}
      </th>
    );
  }
  return (
    <th
      className={`sortable ${column.className || ""}`.trim()}
      scope="col"
      onClick={() => onSort(column.key)}
      title={`Sort by ${column.label}`}
    >
      {column.label}
      <SortMark sort={sort} columnKey={column.key} />
    </th>
  );
}

export function Pagination({ page, pages, total, size, onPage, onSize, noun = "rows" }) {
  return (
    <div className="pagination">
      <span>
        {total ? (page - 1) * size + 1 : 0}{"\u2013"}
        {Math.min(page * size, total)} of{" "}
        {total.toLocaleString("en-US")} {noun}
      </span>
      {onSize && (
        <select
          className="select-mini"
          value={size}
          onChange={(event) => onSize(Number(event.target.value))}
          aria-label="Rows per page"
        >
          {[12, 25, 50].map((value) => (
            <option key={value} value={value}>
              {value} / page
            </option>
          ))}
        </select>
      )}
      <button
        type="button"
        onClick={() => onPage(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
      >
        <ChevronLeft size={12} />
      </button>
      <span>
        {page} / {pages}
      </span>
      <button
        type="button"
        onClick={() => onPage(page + 1)}
        disabled={page >= pages}
        aria-label="Next page"
      >
        <ChevronRight size={12} />
      </button>
    </div>
  );
}

export default function DataTable({
  columns,
  rows,
  rowKey,
  sort,
  onSort,
  onRowClick,
  empty = "No rows match the current scope.",
  className = "",
  wrapClass = "",
}) {
  return (
    <div className={`table-wrap ${wrapClass}`.trim()}>
      <table className={`data-table ${onRowClick ? "clickable" : ""} ${className}`.trim()}>
        <thead>
          <tr>
            {columns.map((column) => (
              <SortHeader
                key={column.key}
                column={column}
                sort={sort}
                onSort={onSort || (() => {})}
              />
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={rowKey ? rowKey(row, index) : index}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              onKeyDown={
                onRowClick
                  ? (event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onRowClick(row);
                      }
                    }
                  : undefined
              }
            >
              {columns.map((column) => (
                <td key={column.key} className={column.className || ""}>
                  {column.render ? column.render(row, index) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td className="empty-cell" colSpan={columns.length}>
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
