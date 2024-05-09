import {
  Paper,
  Container,
  TextField,
  Button,
  Box,
  InputAdornment,
  Typography,
} from "@mui/material";
import { useMachine } from "@xstate/react";
import { machine } from "../../machines";

const SendTokenForm = () => {
  const [snapshot, send] = useMachine(machine);

  const inputToAddress = (event: React.ChangeEvent<HTMLInputElement>) => {
    const toAddress = event.target.value as `0x${string}`;
    send({ type: "input.toAddress", toAddress });
  };

  const inputAmount = (event: React.ChangeEvent<HTMLInputElement>) => {
    const amount = Number.parseFloat(event.target.value);
    send({ type: "input.amount", amount });
  };

  const sendToken = () => {
    send({ type: "submit" });
  };

  return (
    <Paper
      square={false}
      elevation={3}
      sx={{
        p: 4,
        display: "flex",
        flexDirection: "column",
        height: 500,
      }}
    >
      <Container
        maxWidth="sm"
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
          }}
        >
          {snapshot.matches({ wallet: "getAddress" }) ? (
            <Typography variant="subtitle1">Loading Address...</Typography>
          ) : snapshot.matches({ wallet: "getDecimals" }) ? (
            <Typography variant="subtitle1">
              Loading Wallet Settings...
            </Typography>
          ) : snapshot.matches({ wallet: "getBalance" }) ? (
            <Typography variant="subtitle1">Loading Balance...</Typography>
          ) : snapshot.matches({ wallet: "error" }) ? (
            <Typography variant="subtitle1" color="error">
              {snapshot.context.walletError}
            </Typography>
          ) : (
            <Typography variant="subtitle1" sx={{ mb: 2 }}>
              Available Balance: {snapshot.context.balance} USDC
            </Typography>
          )}

          <TextField
            error={snapshot.matches({
              validate: { address: "error" },
            })}
            fullWidth
            label="Send To"
            variant="outlined"
            helperText={snapshot.context.addressError}
            placeholder="Enter 0x Address"
            onChange={inputToAddress}
            value={snapshot.context.toAddress}
          />
          <TextField
            error={snapshot.matches({
              validate: { amount: "error" },
            })}
            fullWidth
            label="USDC"
            type="number"
            variant="outlined"
            helperText={snapshot.context.amountError}
            placeholder="0.0"
            onChange={inputAmount}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">Amount</InputAdornment>
              ),
            }}
            value={snapshot.context.amount}
          />
          <Button
            sx={{ transition: " background-color 2s ease" }}
            type="button"
            variant="contained"
            color={
              // prettier-ignore
              snapshot.matches("done") ? "success"
              : snapshot.matches("waitForTxReceipt") ? "info"
              : "primary"
            }
            size="large"
            onClick={sendToken}
            disabled={
              snapshot.matches({ wallet: "error" }) ||
              snapshot.matches("submit")
            }
          >
            Send Tokens
          </Button>
        </Box>
      </Container>
    </Paper>
  );
};

export default SendTokenForm;
