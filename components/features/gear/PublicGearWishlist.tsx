import {
  Card,
  CardContent,
  CardHeader,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import VolunteerActivismIcon from "@mui/icons-material/VolunteerActivism";
import { PageHeader } from "@/components/ui/PageHeader";

export type PublicGearWishlistData = {
  associationName: string;
  title: string;
  description: string | null;
  items: Array<{
    id: string;
    name: string;
    category: string | null;
    size: string | null;
    description: string | null;
    targetQty: number;
    pledgedQty: number;
    receivedQty: number;
  }>;
};

export function PublicGearWishlist({ data }: { data: PublicGearWishlistData }) {
  return (
    <Stack spacing={2}>
      <PageHeader
        icon={<VolunteerActivismIcon />}
        title={data.title}
        subtitle={`${data.associationName} · ${data.items.length} item${data.items.length === 1 ? "" : "s"}`}
      />
      <Stack spacing={1} sx={{ maxWidth: "68ch" }}>
        {data.description ? <Typography variant="body1">{data.description}</Typography> : null}
        <Typography variant="body2" color="text.secondary">
          Donations are in-kind pledges. They do not reserve or purchase inventory; the association will
          coordinate receipt directly.
        </Typography>
      </Stack>
      <Card component="section" aria-labelledby="wishlist-items-heading">
        <CardHeader
          title="Items needed"
          slotProps={{ title: { id: "wishlist-items-heading", component: "h2" } }}
        />
        {data.items.length === 0 ? (
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              Nothing is needed right now.
            </Typography>
          </CardContent>
        ) : (
          <TableContainer sx={{ border: 0, borderRadius: 0, overflowX: "auto" }}>
            <Table size="small" sx={{ minWidth: 560 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Item</TableCell>
                  <TableCell align="right">Target</TableCell>
                  <TableCell align="right">Promised</TableCell>
                  <TableCell align="right">Received</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.items.map((item) => {
                  const meta = [item.category, item.size].filter(Boolean).join(" - ");
                  return (
                    <TableRow key={item.id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {item.name}
                        </Typography>
                        {meta ? (
                          <Typography variant="caption" color="text.secondary" component="div">
                            {meta}
                          </Typography>
                        ) : null}
                        {item.description ? (
                          <Typography variant="caption" color="text.secondary" component="div">
                            {item.description}
                          </Typography>
                        ) : null}
                      </TableCell>
                      <TableCell align="right">{item.targetQty}</TableCell>
                      <TableCell align="right">{item.pledgedQty}</TableCell>
                      <TableCell align="right">{item.receivedQty}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>
    </Stack>
  );
}
