import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useOfferAnalytics } from '@/hooks/useAdminAnalytics';
import { Loader2, Tag, IndianRupee, Users, TrendingUp, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export function OfferPerformance() {
  const { data, isLoading, error } = useOfferAnalytics();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        Failed to load offer analytics
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No offers created yet. Create offers in the Offers tab.
      </div>
    );
  }

  const totalUsage = data.reduce((sum, o) => sum + o.timesUsed, 0);
  const totalRevenue = data.reduce((sum, o) => sum + o.revenueGenerated, 0);
  const uniqueUsers = data.reduce((sum, o) => sum + o.uniqueUsers, 0);

  const formatRevenue = (amount: number) => {
    return `₹${(amount / 100).toLocaleString('en-IN')}`;
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-2">
        <Card>
          <CardContent className="pt-3 pb-2 text-center">
            <Tag className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-lg font-bold">{totalUsage}</p>
            <p className="text-[10px] text-muted-foreground">Total Uses</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 pb-2 text-center">
            <IndianRupee className="h-4 w-4 mx-auto mb-1 text-green-600" />
            <p className="text-lg font-bold text-green-600">{formatRevenue(totalRevenue)}</p>
            <p className="text-[10px] text-muted-foreground">Revenue</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 pb-2 text-center">
            <Users className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-lg font-bold">{uniqueUsers}</p>
            <p className="text-[10px] text-muted-foreground">Unique Users</p>
          </CardContent>
        </Card>
      </div>

      {/* Offers List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Offer Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.map((offer) => (
            <div 
              key={offer.offerId} 
              className="p-3 rounded-lg border bg-card"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{offer.offerName}</span>
                    <Badge 
                      variant={offer.isActive ? 'default' : 'secondary'}
                      className="text-[10px]"
                    >
                      {offer.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded mt-1 inline-block">
                    {offer.promoCode}
                  </code>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-green-600">
                    {formatRevenue(offer.revenueGenerated)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">revenue</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-muted/50 rounded p-1.5">
                  <p className="text-sm font-medium">{offer.timesUsed}</p>
                  <p className="text-[10px] text-muted-foreground">Uses</p>
                </div>
                <div className="bg-muted/50 rounded p-1.5">
                  <p className="text-sm font-medium">{offer.uniqueUsers}</p>
                  <p className="text-[10px] text-muted-foreground">Users</p>
                </div>
                <div className="bg-muted/50 rounded p-1.5">
                  <p className="text-sm font-medium">
                    {offer.discountType === 'percentage' 
                      ? `${offer.discountValue}%` 
                      : formatRevenue(offer.discountValue * 100)
                    }
                  </p>
                  <p className="text-[10px] text-muted-foreground">Discount</p>
                </div>
              </div>

              <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>
                  {format(new Date(offer.startDate), 'dd MMM')} - {format(new Date(offer.endDate), 'dd MMM yyyy')}
                </span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Top Performer Highlight */}
      {data.length > 0 && data[0].timesUsed > 0 && (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-green-700 text-xs font-medium mb-1">
              <TrendingUp className="h-3 w-3" />
              Top Performer
            </div>
            <p className="text-sm">
              <code className="bg-green-100 text-green-800 px-1.5 py-0.5 rounded">
                {data[0].promoCode}
              </code>
              {' '}has been used <strong>{data[0].timesUsed}</strong> times, 
              generating <strong className="text-green-700">{formatRevenue(data[0].revenueGenerated)}</strong> in revenue.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
